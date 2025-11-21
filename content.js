/**
 * Hipages Lead Monitor - Content Script
 * Monitors lead pages for Rental Bond Cleaning jobs with Waitlist or Available status
 * Automatically refreshes and detects new leads
 */

(function() {
  'use strict';

  // Configuration
  const DEFAULT_CATEGORY_FILTERS = ['Rental Bond Cleaning'];
  const DEFAULT_REFRESH_INTERVAL = 5000; // 5 seconds in milliseconds
  const DEFAULT_PAUSE_AFTER_CLICK = 20000; // 20 seconds in milliseconds
  const STORAGE_KEY_LEADS = 'hipages_monitored_leads';
  const STORAGE_KEY_SETTINGS = 'hipages_monitor_settings';
  const STORAGE_KEY_SOUNDED_LEADS = 'hipages_sounded_leads'; // Track leads that have already played sound
  const STORAGE_KEY_FIRST_SEEN = 'hipages_first_seen_timestamps'; // Track when leads were first detected
  const NEW_LEAD_CLASS = 'hipages-new-lead';
  const NEW_LEAD_INDICATOR_CLASS = 'hipages-new-indicator';

  // State
  let refreshInterval = null;
  let temporaryPauseTimeout = null;
  let temporaryPauseStartTime = null; // Track when pause started
  let temporaryPauseDuration = 0; // Track the pause duration
  let isMonitoring = false;
  let currentSettings = {
    refreshInterval: DEFAULT_REFRESH_INTERVAL,
    pauseAfterClick: DEFAULT_PAUSE_AFTER_CLICK,
    categoryFilters: DEFAULT_CATEGORY_FILTERS,
    enableSound: true, // Enable sound by default
    isPaused: false,
    pauseMode: 'reset' // 'reset', 'extend', or 'max'
  };

  /**
   * Extract lead ID from accept link href
   */
  function extractLeadId(acceptLink) {
    const href = acceptLink.getAttribute('href') || '';
    const match = href.match(/\/leads\/([^\/]+)\//);
    return match ? match[1] : null;
  }

  /**
   * Extract lead status from the status badge
   * Returns the status text or null if not found
   */
  function extractLeadStatus(leadElement) {
    const statusElement = leadElement.querySelector('span[role="status"]');
    if (!statusElement) return null;
    
    const statusText = statusElement.textContent.trim();
    // Return the actual status text (could be Waitlist, Available, or other statuses)
    return statusText || null;
  }

  /**
   * Extract category/job type from lead element
   */
  function extractCategory(leadElement) {
    // Look for all divs with SVG icons - location comes first, category comes second
    const categoryDivs = leadElement.querySelectorAll('div.flex.flex-row.items-center.gap-xs.text-body-emphasis');
    
    // The category is typically the second div (first is location)
    // But we'll check all of them to find one that doesn't look like a location
    for (let i = 0; i < categoryDivs.length; i++) {
      const div = categoryDivs[i];
      const svg = div.querySelector('svg');
      const text = div.textContent.trim();
      
      if (svg && text) {
        // Skip if it looks like a location (contains comma and numbers/postcode pattern)
        if (text.match(/,\s*\d{4}/) || text.match(/^[A-Z][a-z]+\s*,\s*\d+/)) {
          continue; // This is likely the location, skip it
        }
        
        // This should be the category
        return text;
      }
    }
    
    // Fallback: if we have at least 2 divs, the second one is likely the category
    if (categoryDivs.length >= 2) {
      const categoryDiv = categoryDivs[1];
      const text = categoryDiv.textContent.trim();
      // Clean up the text (remove any location remnants)
      return text.split(',')[0].trim();
    }
    
    return null;
  }

  /**
   * Extract lead information from a lead article element
   * Only includes leads that have an Accept button (not Join Waitlist)
   */
  function extractLeadInfo(leadElement) {
    // Check if lead has an accept button - this is the main filter now
    const acceptLink = leadElement.querySelector('a[aria-controls^="accept-lead-"]');
    if (!acceptLink) return null;

    // Verify it's actually an Accept button, not a Join Waitlist button
    // Check the button text to ensure it's an Accept button
    const buttonText = acceptLink.textContent.trim().toLowerCase();
    
    // Exclude if it's a Join Waitlist button
    if (buttonText.includes('join waitlist') || buttonText === 'waitlist') {
      return null;
    }
    
    // Only include if it's an Accept button
    if (!buttonText.includes('accept')) {
      return null;
    }

    const leadId = extractLeadId(acceptLink);
    if (!leadId) return null;

    // Extract status for display purposes (but don't filter by it)
    const status = extractLeadStatus(leadElement) || 'Unknown';

    const category = extractCategory(leadElement);
    if (!category) return null;
    
    // Check if category matches any of the configured filters
    const categoryFilters = currentSettings.categoryFilters || DEFAULT_CATEGORY_FILTERS;
    const categoryLower = category.toLowerCase();
    const matchesFilter = categoryFilters.some(filter => 
      categoryLower.includes(filter.toLowerCase())
    );
    
    if (!matchesFilter) return null;

    // Extract customer name
    const nameElement = leadElement.querySelector('h2.text-content.text-title-sm');
    const customerName = nameElement ? nameElement.textContent.trim() : 'Unknown';

    // Extract timestamp
    const timeElement = leadElement.querySelector('time[datetime]');
    const timestamp = timeElement ? timeElement.getAttribute('datetime') : null;

    // Extract location (first div with SVG icon, typically contains location and postcode)
    const locationDivs = leadElement.querySelectorAll('div.flex.flex-row.items-center.gap-xs.text-body-emphasis');
    let location = 'Unknown';
    if (locationDivs.length > 0) {
      const locationText = locationDivs[0].textContent.trim();
      // Location typically has format "Suburb, Postcode" - extract just the suburb
      location = locationText.split(',')[0].trim();
    }

    return {
      id: leadId,
      status: status,
      category: category,
      customerName: customerName,
      timestamp: timestamp,
      location: location,
      element: leadElement
    };
  }

  /**
   * Get all matching leads from the page
   */
  function getMatchingLeads() {
    const leadArticles = document.querySelectorAll('article[data-tracking-label="Lead card"]');
    const matchingLeads = [];

    leadArticles.forEach(article => {
      const leadInfo = extractLeadInfo(article);
      if (leadInfo) {
        matchingLeads.push(leadInfo);
      }
    });

    return matchingLeads;
  }

  /**
   * Load stored leads from Chrome storage
   */
  async function loadStoredLeads() {
    try {
      const result = await chrome.storage.local.get([STORAGE_KEY_LEADS]);
      return result[STORAGE_KEY_LEADS] || [];
    } catch (error) {
      console.error('Error loading stored leads:', error);
      return [];
    }
  }

  /**
   * Save leads to Chrome storage
   */
  async function saveLeads(leads) {
    try {
      await chrome.storage.local.set({ [STORAGE_KEY_LEADS]: leads });
    } catch (error) {
      console.error('Error saving leads:', error);
    }
  }

  /**
   * Load settings from Chrome storage
   */
  async function loadSettings() {
    try {
      const result = await chrome.storage.local.get([STORAGE_KEY_SETTINGS]);
      if (result[STORAGE_KEY_SETTINGS]) {
        currentSettings = { 
          refreshInterval: DEFAULT_REFRESH_INTERVAL,
          pauseAfterClick: DEFAULT_PAUSE_AFTER_CLICK,
          categoryFilters: DEFAULT_CATEGORY_FILTERS,
          enableSound: true,
          pauseMode: 'reset',
          isPaused: false,
          ...result[STORAGE_KEY_SETTINGS] 
        };
        // Ensure categoryFilters exists and is an array
        if (!currentSettings.categoryFilters || !Array.isArray(currentSettings.categoryFilters)) {
          currentSettings.categoryFilters = DEFAULT_CATEGORY_FILTERS;
        }
        // Ensure enableSound is boolean
        if (currentSettings.enableSound === undefined) {
          currentSettings.enableSound = true;
        }
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  }

  /**
   * Save settings to Chrome storage
   */
  async function saveSettings() {
    try {
      await chrome.storage.local.set({ [STORAGE_KEY_SETTINGS]: currentSettings });
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  }

  /**
   * Add visual indicator to a new lead
   */
  function markAsNew(leadElement) {
    // Add class to the article element
    leadElement.classList.add(NEW_LEAD_CLASS);

    // Add "NEW" badge indicator
    const statusSection = leadElement.querySelector('section.mb-md.border-border-neutral.pb-md');
    if (statusSection) {
      // Check if indicator already exists
      let indicator = statusSection.querySelector(`.${NEW_LEAD_INDICATOR_CLASS}`);
      if (!indicator) {
        indicator = document.createElement('span');
        indicator.className = NEW_LEAD_INDICATOR_CLASS;
        indicator.textContent = 'NEW';
        indicator.title = 'This is a newly detected lead';
        
        // Insert after the status badge
        const statusBadge = statusSection.querySelector('span[role="status"]');
        if (statusBadge && statusBadge.parentElement) {
          statusBadge.parentElement.appendChild(indicator);
        } else {
          statusSection.appendChild(indicator);
        }
      }
    }
  }

  /**
   * Remove new lead indicators (after user has seen them)
   */
  function removeNewIndicators() {
    const indicators = document.querySelectorAll(`.${NEW_LEAD_INDICATOR_CLASS}`);
    indicators.forEach(indicator => indicator.remove());
    
    const newLeads = document.querySelectorAll(`.${NEW_LEAD_CLASS}`);
    newLeads.forEach(lead => lead.classList.remove(NEW_LEAD_CLASS));
  }

  /**
   * Play beep sound using Web Audio API
   */
  function playBeep() {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      // Configure beep sound
      oscillator.frequency.value = 800; // Frequency in Hz (higher = higher pitch)
      oscillator.type = 'sine'; // Sine wave for smooth beep

      // Set volume (gain)
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 3.0);

      // Play beep
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 3.0); // 3 second beep

      console.log('[Hipages Monitor] Beep sound played');
    } catch (error) {
      console.error('[Hipages Monitor] Error playing beep:', error);
    }
  }

  /**
   * Load list of leads that have already played sound
   */
  async function loadSoundedLeads() {
    try {
      const result = await chrome.storage.local.get([STORAGE_KEY_SOUNDED_LEADS]);
      return result[STORAGE_KEY_SOUNDED_LEADS] || [];
    } catch (error) {
      console.error('Error loading sounded leads:', error);
      return [];
    }
  }

  /**
   * Save lead ID to sounded leads list
   */
  async function saveSoundedLead(leadId) {
    try {
      const soundedLeads = await loadSoundedLeads();
      if (!soundedLeads.includes(leadId)) {
        soundedLeads.push(leadId);
        await chrome.storage.local.set({ [STORAGE_KEY_SOUNDED_LEADS]: soundedLeads });
      }
    } catch (error) {
      console.error('Error saving sounded lead:', error);
    }
  }

  /**
   * Load first seen timestamps for leads
   */
  async function loadFirstSeenTimestamps() {
    try {
      const result = await chrome.storage.local.get([STORAGE_KEY_FIRST_SEEN]);
      return result[STORAGE_KEY_FIRST_SEEN] || {};
    } catch (error) {
      console.error('Error loading first seen timestamps:', error);
      return {};
    }
  }

  /**
   * Save first seen timestamp for a lead
   */
  async function saveFirstSeenTimestamp(leadId) {
    try {
      const firstSeenTimestamps = await loadFirstSeenTimestamps();
      // Only save if not already saved (first detection)
      if (!firstSeenTimestamps[leadId]) {
        firstSeenTimestamps[leadId] = Date.now();
        await chrome.storage.local.set({ [STORAGE_KEY_FIRST_SEEN]: firstSeenTimestamps });
      }
    } catch (error) {
      console.error('Error saving first seen timestamp:', error);
    }
  }

  /**
   * Temporarily pause auto-refresh
   * @param {number} duration - Duration in milliseconds
   */
  function temporaryPause(duration) {
    const mode = currentSettings.pauseMode || 'reset';
    
    // Calculate remaining time if pause is already active
    let remainingTime = 0;
    if (temporaryPauseTimeout && temporaryPauseStartTime) {
      const elapsed = Date.now() - temporaryPauseStartTime;
      remainingTime = Math.max(0, temporaryPauseDuration - elapsed);
    }

    let pauseDuration = duration;
    
    if (mode === 'extend' && temporaryPauseTimeout && remainingTime > 0) {
      // Extend mode: Add the new duration to remaining time
      pauseDuration = remainingTime + duration;
      console.log(`[Hipages Monitor] Extending pause: ${(remainingTime / 1000).toFixed(1)}s remaining + ${duration / 1000}s = ${pauseDuration / 1000}s total`);
    } else if (mode === 'max' && temporaryPauseTimeout && remainingTime > 0) {
      // Max mode: Use the longer of remaining time or new duration
      pauseDuration = Math.max(remainingTime, duration);
      console.log(`[Hipages Monitor] Using maximum pause: ${pauseDuration / 1000}s (was ${(remainingTime / 1000).toFixed(1)}s remaining)`);
    } else {
      // Reset mode (default): Clear existing and start fresh
      if (temporaryPauseTimeout) {
        clearTimeout(temporaryPauseTimeout);
        temporaryPauseTimeout = null;
        console.log(`[Hipages Monitor] Resetting pause timer (was ${(remainingTime / 1000).toFixed(1)}s remaining)`);
      }
    }

    console.log(`[Hipages Monitor] Starting temporary pause for ${pauseDuration / 1000} seconds`);

    // Stop the current refresh interval immediately
    if (refreshInterval) {
      clearInterval(refreshInterval);
      refreshInterval = null;
      console.log(`[Hipages Monitor] Refresh interval cleared`);
    }

    // Track pause start time and duration
    temporaryPauseStartTime = Date.now();
    temporaryPauseDuration = pauseDuration;

    // Set timeout to resume monitoring
    temporaryPauseTimeout = setTimeout(() => {
      console.log(`[Hipages Monitor] Temporary pause expired, resuming monitoring`);
      const wasMonitoring = isMonitoring;
      
      // Clear pause state
      temporaryPauseTimeout = null;
      temporaryPauseStartTime = null;
      temporaryPauseDuration = 0;
      
      // Clear any existing interval (should be null already, but be safe)
      if (refreshInterval) {
        clearInterval(refreshInterval);
        refreshInterval = null;
      }
      
      // Always resume if not manually paused (page reload resets state anyway)
      if (!currentSettings.isPaused) {
        console.log(`[Hipages Monitor] Resuming monitoring after temporary pause`);
        isMonitoring = false; // Reset flag to allow fresh start
        startMonitoring();
      } else {
        console.log(`[Hipages Monitor] Not resuming - manually paused: ${currentSettings.isPaused}`);
      }
    }, pauseDuration);

    console.log(`[Hipages Monitor] Auto-refresh paused for ${pauseDuration / 1000} seconds`);
  }

  /**
   * Scroll to a specific lead by ID
   */
  function scrollToLead(leadId, pauseDuration = DEFAULT_PAUSE_AFTER_CLICK) {
    console.log(`[Hipages Monitor] Scrolling to lead ${leadId}, pausing for ${pauseDuration / 1000}s`);
    
    // IMPORTANT: Pause FIRST before doing anything else
    temporaryPause(pauseDuration);
    
    // Find the lead element by looking for the accept link with the lead ID
    const acceptLink = document.querySelector(`a[aria-controls="accept-lead-${leadId}"]`);
    if (!acceptLink) {
      console.warn(`[Hipages Monitor] Lead with ID ${leadId} not found on page`);
      return false;
    }

    // Find the parent article element (the lead card)
    const leadArticle = acceptLink.closest('article[data-tracking-label="Lead card"]');
    if (!leadArticle) {
      console.warn(`[Hipages Monitor] Could not find lead article for ID ${leadId}`);
      return false;
    }

    // Add temporary highlight class
    leadArticle.classList.add('hipages-scroll-highlight');

    // Scroll to the element with smooth behavior
    leadArticle.scrollIntoView({
      behavior: 'smooth',
      block: 'center'
    });

    // Remove highlight after animation
    setTimeout(() => {
      leadArticle.classList.remove('hipages-scroll-highlight');
    }, 2000);

    return true;
  }

  /**
   * Compare current leads with stored leads and mark new ones
   */
  async function detectNewLeads() {
    if (currentSettings.isPaused) {
      return;
    }

    try {
      const currentLeads = getMatchingLeads();
      const storedLeads = await loadStoredLeads();

      // Create a map of stored lead IDs for quick lookup
      const storedLeadIds = new Set(storedLeads.map(lead => lead.id));

      // Find new leads
      const newLeads = currentLeads.filter(lead => !storedLeadIds.has(lead.id));

      // Mark new leads visually and record first seen timestamp
      newLeads.forEach(lead => {
        markAsNew(lead.element);
        // Record first seen timestamp for new leads
        saveFirstSeenTimestamp(lead.id);
      });

      // Play beep for new leads that haven't played sound yet (if sound is enabled)
      // Note: All leads in newLeads already have Accept buttons (Join Waitlist is filtered out)
      if (currentSettings.enableSound !== false) {
        const soundedLeads = await loadSoundedLeads();
        const soundedLeadIds = new Set(soundedLeads);
        const newLeadsToSound = newLeads.filter(lead => 
          !soundedLeadIds.has(lead.id)
        );

        if (newLeadsToSound.length > 0) {
          console.log(`[Hipages Monitor] Found ${newLeadsToSound.length} new lead(s) with Accept button, playing beep`);
          
          // Play beep for each new lead (with slight delay between multiple beeps)
          newLeadsToSound.forEach((lead, index) => {
            setTimeout(() => {
              playBeep();
              // Mark this lead as having played sound
              saveSoundedLead(lead.id);
            }, index * 400); // 400ms delay between beeps if multiple
          });
        }
      }

      // Save current leads (only IDs and essential info for comparison)
      const leadsToStore = currentLeads.map(lead => ({
        id: lead.id,
        status: lead.status,
        category: lead.category,
        timestamp: lead.timestamp
      }));

      await saveLeads(leadsToStore);

      // Log new leads found
      if (newLeads.length > 0) {
        console.log(`[Hipages Monitor] Found ${newLeads.length} new lead(s):`, newLeads.map(l => l.id));
        
        // Send message to popup if open
        chrome.runtime.sendMessage({
          type: 'NEW_LEADS_DETECTED',
          count: newLeads.length,
          leads: newLeads.map(l => ({
            id: l.id,
            customerName: l.customerName,
            location: l.location,
            status: l.status
          }))
        }).catch(() => {
          // Ignore errors if popup is not open
        });
      }
    } catch (error) {
      console.error('[Hipages Monitor] Error detecting new leads:', error);
    }
  }

  /**
   * Refresh the page
   */
  function refreshPage() {
    // Don't refresh if manually paused or temporarily paused
    if (currentSettings.isPaused) {
      console.log(`[Hipages Monitor] Refresh skipped - manually paused`);
      return;
    }
    
    if (temporaryPauseTimeout) {
      console.log(`[Hipages Monitor] Refresh skipped - temporarily paused`);
      return;
    }
    
    console.log(`[Hipages Monitor] Refreshing page...`);
    window.location.reload();
  }

  /**
   * Start monitoring with auto-refresh
   */
  function startMonitoring() {
    // Don't start if manually paused
    if (currentSettings.isPaused) {
      console.log(`[Hipages Monitor] Cannot start - manually paused`);
      return;
    }

    // Don't start if temporarily paused (but allow if timeout was cleared, e.g., after page reload)
    if (temporaryPauseTimeout) {
      console.log(`[Hipages Monitor] Cannot start - temporarily paused`);
      return;
    }

    // Clear any existing interval first
    if (refreshInterval) {
      console.log(`[Hipages Monitor] Clearing existing interval before restart`);
      clearInterval(refreshInterval);
      refreshInterval = null;
    }

    // Set monitoring flag
    isMonitoring = true;
    
    // Initial detection
    detectNewLeads();

    // Set up auto-refresh interval
    refreshInterval = setInterval(() => {
      console.log(`[Hipages Monitor] Interval tick - checking conditions`);
      
      // Don't refresh if manually paused
      if (currentSettings.isPaused) {
        console.log(`[Hipages Monitor] Interval tick - skipped (manually paused)`);
        return;
      }
      
      // Don't refresh if temporarily paused
      if (temporaryPauseTimeout) {
        console.log(`[Hipages Monitor] Interval tick - skipped (temporarily paused)`);
        return;
      }
      
      // All checks passed, refresh the page
      console.log(`[Hipages Monitor] Interval tick - refreshing page`);
      refreshPage();
    }, currentSettings.refreshInterval);
    
    console.log(`[Hipages Monitor] Monitoring started with ${currentSettings.refreshInterval / 1000}s interval. Interval ID: ${refreshInterval}`);
  }

  /**
   * Stop monitoring
   */
  function stopMonitoring() {
    isMonitoring = false;
    if (refreshInterval) {
      clearInterval(refreshInterval);
      refreshInterval = null;
    }
  }

  /**
   * Initialize the extension
   */
  async function init() {
    await loadSettings();
    
    // Wait for page to be fully loaded
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => {
          // Always start monitoring on page load (page reload resets everything)
          console.log(`[Hipages Monitor] Page loaded, starting monitoring`);
          isMonitoring = false; // Reset flag to allow fresh start
          refreshInterval = null; // Ensure interval is cleared
          startMonitoring();
        }, 2000); // Wait 2 seconds for dynamic content to load
      });
    } else {
      setTimeout(() => {
        // Always start monitoring on page load (page reload resets everything)
        console.log(`[Hipages Monitor] Page ready, starting monitoring`);
        isMonitoring = false; // Reset flag to allow fresh start
        refreshInterval = null; // Ensure interval is cleared
        startMonitoring();
      }, 2000);
    }

    // Listen for messages from popup
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.type === 'GET_LEADS') {
        (async () => {
          const leads = getMatchingLeads();
          const firstSeenTimestamps = await loadFirstSeenTimestamps();
          sendResponse({ leads: leads.map(l => ({
            id: l.id,
            customerName: l.customerName,
            location: l.location,
            status: l.status,
            category: l.category,
            timestamp: l.timestamp,
            firstSeen: firstSeenTimestamps[l.id] || null
          })) });
        })();
        return true;
      } else if (message.type === 'UPDATE_SETTINGS') {
        const oldFilters = currentSettings.categoryFilters ? [...currentSettings.categoryFilters] : [];
        currentSettings = { ...currentSettings, ...message.settings };
        
        // Ensure categoryFilters is an array
        if (!currentSettings.categoryFilters || !Array.isArray(currentSettings.categoryFilters)) {
          currentSettings.categoryFilters = DEFAULT_CATEGORY_FILTERS;
        }
        
        saveSettings();
        
        // Check if filters changed
        const filtersChanged = JSON.stringify(oldFilters) !== JSON.stringify(currentSettings.categoryFilters);
        
        // Restart monitoring with new settings
        stopMonitoring();
        startMonitoring();
        
        if (filtersChanged) {
          console.log(`[Hipages Monitor] Category filters updated: ${currentSettings.categoryFilters.join(', ')}`);
        }
        
        sendResponse({ success: true });
        return true;
      } else if (message.type === 'CLEAR_NEW_INDICATORS') {
        removeNewIndicators();
        sendResponse({ success: true });
        return true;
      } else if (message.type === 'PAUSE_MONITORING') {
        currentSettings.isPaused = true;
        saveSettings();
        sendResponse({ success: true });
        return true;
      } else if (message.type === 'RESUME_MONITORING') {
        currentSettings.isPaused = false;
        saveSettings();
        startMonitoring();
        sendResponse({ success: true });
        return true;
      } else if (message.type === 'SCROLL_TO_LEAD') {
        const pauseDuration = message.pauseDuration || currentSettings.pauseAfterClick || DEFAULT_PAUSE_AFTER_CLICK;
        const success = scrollToLead(message.leadId, pauseDuration);
        sendResponse({ success: success });
        return true;
      }
    });
  }

  // Initialize when script loads
  init();
})();

