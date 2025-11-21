/**
 * Hipages Lead Monitor - Popup Script
 * Handles the popup UI and communication with content script
 */

(function() {
  'use strict';

  const STORAGE_KEY_SETTINGS = 'hipages_monitor_settings';
  const DEFAULT_REFRESH_INTERVAL = 5000;
  const DEFAULT_PAUSE_AFTER_CLICK = 20000; // 20 seconds in milliseconds

  let currentSettings = {
    refreshInterval: DEFAULT_REFRESH_INTERVAL,
    pauseAfterClick: DEFAULT_PAUSE_AFTER_CLICK,
    pauseMode: 'reset',
    categoryFilters: ['Rental Bond Cleaning'], // Default filter
    enableSound: true, // Enable sound by default
    isPaused: false
  };

  // DOM Elements
  const settingsBtn = document.getElementById('settingsBtn');
  const tabButtons = document.querySelectorAll('.tab-btn');
  const dashboardTab = document.getElementById('dashboardTab');
  const settingsTab = document.getElementById('settingsTab');
  const categoryFiltersContainer = document.getElementById('categoryFilters');
  const newCategoryInput = document.getElementById('newCategoryFilter');
  const addCategoryBtn = document.getElementById('addCategoryBtn');
  const activeCategoriesSpan = document.getElementById('activeCategories');
  const refreshIntervalInput = document.getElementById('refreshInterval');
  const pauseAfterClickInput = document.getElementById('pauseAfterClick');
  const pauseModeSelect = document.getElementById('pauseMode');
  const saveSettingsBtn = document.getElementById('saveSettings');
  const pauseResumeBtn = document.getElementById('pauseResumeBtn');
  const clearIndicatorsBtn = document.getElementById('clearIndicatorsBtn');
  const enableSoundCheckbox = document.getElementById('enableSound');
  const statusText = document.getElementById('statusText');
  const statusDot = document.getElementById('statusDot');
  const leadCount = document.getElementById('leadCount');
  const leadsList = document.getElementById('leadsList');
  const autoRefreshStatus = document.getElementById('autoRefreshStatus');

  /**
   * Load settings from storage
   */
  async function loadSettings() {
    try {
      const result = await chrome.storage.local.get([STORAGE_KEY_SETTINGS]);
      if (result[STORAGE_KEY_SETTINGS]) {
        currentSettings = { ...currentSettings, ...result[STORAGE_KEY_SETTINGS] };
        // Ensure categoryFilters exists
        if (!currentSettings.categoryFilters || currentSettings.categoryFilters.length === 0) {
          currentSettings.categoryFilters = ['Rental Bond Cleaning'];
        }
        refreshIntervalInput.value = currentSettings.refreshInterval / 1000; // Convert to seconds
        pauseAfterClickInput.value = (currentSettings.pauseAfterClick || DEFAULT_PAUSE_AFTER_CLICK) / 1000; // Convert to seconds
        pauseModeSelect.value = currentSettings.pauseMode || 'reset';
        enableSoundCheckbox.checked = currentSettings.enableSound !== false; // Default to true
        updateCategoryFilters();
        updatePauseResumeButton();
        updateStatus();
      } else {
        // Set default values if not in settings
        pauseAfterClickInput.value = DEFAULT_PAUSE_AFTER_CLICK / 1000;
        pauseModeSelect.value = 'reset';
        updateCategoryFilters();
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  }

  /**
   * Save settings to storage
   */
  async function saveSettings() {
    try {
      await chrome.storage.local.set({ [STORAGE_KEY_SETTINGS]: currentSettings });
      
      // Send settings to content script
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tabs[0] && tabs[0].url && tabs[0].url.includes('tradiecore.hipages.com.au')) {
        chrome.tabs.sendMessage(tabs[0].id, {
          type: 'UPDATE_SETTINGS',
          settings: currentSettings
        }, () => {
          // Reload leads after settings update to apply new filters
          if (!chrome.runtime.lastError) {
            setTimeout(() => loadLeads(), 500);
          }
        });
      }
      
      showNotification('Settings saved!');
    } catch (error) {
      console.error('Error saving settings:', error);
      showNotification('Error saving settings', true);
    }
  }

  /**
   * Update pause/resume button text
   */
  function updatePauseResumeButton() {
    if (currentSettings.isPaused) {
      pauseResumeBtn.textContent = 'Resume';
      pauseResumeBtn.classList.remove('btn-paused');
      pauseResumeBtn.classList.add('btn-resumed');
    } else {
      pauseResumeBtn.textContent = 'Pause';
      pauseResumeBtn.classList.remove('btn-resumed');
      pauseResumeBtn.classList.add('btn-paused');
    }
  }

  /**
   * Update status indicator
   */
  function updateStatus() {
    if (currentSettings.isPaused) {
      statusText.textContent = 'Paused';
      statusDot.className = 'status-dot paused';
      autoRefreshStatus.textContent = 'Paused';
    } else {
      statusText.textContent = 'Monitoring';
      statusDot.className = 'status-dot active';
      autoRefreshStatus.textContent = 'Enabled';
    }
    
    // Update active categories display
    if (currentSettings.categoryFilters && currentSettings.categoryFilters.length > 0) {
      activeCategoriesSpan.textContent = currentSettings.categoryFilters.join(', ');
    } else {
      activeCategoriesSpan.textContent = 'None';
    }
  }

  /**
   * Update category filters display
   */
  function updateCategoryFilters() {
    categoryFiltersContainer.innerHTML = '';
    
    if (!currentSettings.categoryFilters || currentSettings.categoryFilters.length === 0) {
      categoryFiltersContainer.innerHTML = '<div class="no-filters">No filters added. Add a category above.</div>';
      return;
    }
    
    currentSettings.categoryFilters.forEach((category, index) => {
      const filterItem = document.createElement('div');
      filterItem.className = 'filter-item';
      filterItem.innerHTML = `
        <span class="filter-name">${escapeHtml(category)}</span>
        <button class="btn-remove-filter" data-index="${index}" title="Remove filter">×</button>
      `;
      categoryFiltersContainer.appendChild(filterItem);
    });
    
    // Add click handlers for remove buttons
    categoryFiltersContainer.querySelectorAll('.btn-remove-filter').forEach(btn => {
      btn.addEventListener('click', () => {
        const index = parseInt(btn.getAttribute('data-index'), 10);
        removeCategoryFilter(index);
      });
    });
  }

  /**
   * Add a new category filter
   */
  function addCategoryFilter(category) {
    const trimmedCategory = category.trim();
    if (!trimmedCategory) {
      showNotification('Please enter a category name.', true);
      return;
    }
    
    if (!currentSettings.categoryFilters) {
      currentSettings.categoryFilters = [];
    }
    
    // Check if already exists (case-insensitive)
    const exists = currentSettings.categoryFilters.some(
      cat => cat.toLowerCase() === trimmedCategory.toLowerCase()
    );
    
    if (exists) {
      showNotification('This category is already in the filter list.', true);
      return;
    }
    
    currentSettings.categoryFilters.push(trimmedCategory);
    updateCategoryFilters();
    updateStatus();
    newCategoryInput.value = '';
    showNotification(`Added filter: ${trimmedCategory}`);
  }

  /**
   * Remove a category filter
   */
  function removeCategoryFilter(index) {
    if (currentSettings.categoryFilters && index >= 0 && index < currentSettings.categoryFilters.length) {
      const removed = currentSettings.categoryFilters.splice(index, 1)[0];
      updateCategoryFilters();
      updateStatus();
      saveSettings(); // Save immediately when removing filter
      showNotification(`Removed filter: ${removed}`);
    }
  }

  /**
   * Load leads from content script
   */
  async function loadLeads() {
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tabs[0] || !tabs[0].url || !tabs[0].url.includes('tradiecore.hipages.com.au')) {
        leadsList.innerHTML = '<div class="error">Please navigate to a Hipages leads page first.</div>';
        return;
      }

      chrome.tabs.sendMessage(tabs[0].id, { type: 'GET_LEADS' }, (response) => {
        if (chrome.runtime.lastError) {
          leadsList.innerHTML = '<div class="error">Could not connect to page. Please refresh the page.</div>';
          return;
        }

        if (response && response.leads) {
          displayLeads(response.leads);
          leadCount.textContent = response.leads.length;
        } else {
          leadsList.innerHTML = '<div class="no-leads">No matching leads found.</div>';
          leadCount.textContent = '0';
        }
      });
    } catch (error) {
      console.error('Error loading leads:', error);
      leadsList.innerHTML = '<div class="error">Error loading leads.</div>';
    }
  }

  /**
   * Display leads in the list
   */
  function displayLeads(leads) {
    if (leads.length === 0) {
      leadsList.innerHTML = '<div class="no-leads">No matching leads found.</div>';
      return;
    }

    const now = Date.now();
    const oneMinute = 60 * 1000; // 1 minute in milliseconds

    const leadsHTML = leads.map(lead => {
      const date = lead.timestamp ? new Date(lead.timestamp).toLocaleString() : 'Unknown date';
      
      // Check if lead was first seen within the last 1 minute
      const isNewlyDetected = lead.firstSeen && (now - lead.firstSeen) < oneMinute;
      
      return `
        <div class="lead-item ${isNewlyDetected ? 'newly-detected' : ''}" data-lead-id="${lead.id}" data-first-seen="${lead.firstSeen || ''}" title="Click to scroll to this lead on the page">
          <div class="lead-header">
            <span class="lead-name">
              ${isNewlyDetected ? '<span class="new-lead-dot"></span>' : ''}
              ${escapeHtml(lead.customerName)}
            </span>
            <span class="lead-status ${lead.status.toLowerCase()}">${lead.status}</span>
          </div>
          <div class="lead-details">
            <span class="lead-category">📋 ${escapeHtml(lead.category || 'Unknown Category')}</span>
            <span class="lead-location">📍 ${escapeHtml(lead.location)}</span>
            <span class="lead-date">🕒 ${date}</span>
          </div>
          <div class="lead-id">ID: ${lead.id}</div>
        </div>
      `;
    }).join('');

    leadsList.innerHTML = leadsHTML;

    // Add click handlers to lead items
    const leadItems = leadsList.querySelectorAll('.lead-item');
    leadItems.forEach(item => {
      item.addEventListener('click', async () => {
        const leadId = item.getAttribute('data-lead-id');
        await scrollToLeadOnPage(leadId);
      });
    });

    // Set up timers to remove red dots after 1 minute
    leadItems.forEach(item => {
      const firstSeen = item.getAttribute('data-first-seen');
      if (firstSeen) {
        const firstSeenTime = parseInt(firstSeen, 10);
        const timeRemaining = oneMinute - (now - firstSeenTime);
        
        if (timeRemaining > 0 && timeRemaining <= oneMinute) {
          setTimeout(() => {
            item.classList.remove('newly-detected');
            const dot = item.querySelector('.new-lead-dot');
            if (dot) {
              dot.remove();
            }
          }, timeRemaining);
        }
      }
    });
  }

  /**
   * Scroll to a lead on the page
   */
  async function scrollToLeadOnPage(leadId) {
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tabs[0] || !tabs[0].url || !tabs[0].url.includes('tradiecore.hipages.com.au')) {
        showNotification('Please navigate to a Hipages leads page first.', true);
        return;
      }

      chrome.tabs.sendMessage(tabs[0].id, {
        type: 'SCROLL_TO_LEAD',
        leadId: leadId,
        pauseDuration: currentSettings.pauseAfterClick || DEFAULT_PAUSE_AFTER_CLICK
      }, (response) => {
        if (chrome.runtime.lastError) {
          showNotification('Could not scroll to lead. Please refresh the page.', true);
          return;
        }

        if (response && response.success) {
          const pauseSeconds = (currentSettings.pauseAfterClick || DEFAULT_PAUSE_AFTER_CLICK) / 1000;
          showNotification(`Scrolled to lead! Auto-refresh paused for ${pauseSeconds}s`);
          // Optionally close the popup after scrolling
          // window.close();
        } else {
          showNotification('Lead not found on page. It may have been removed.', true);
        }
      });
    } catch (error) {
      console.error('Error scrolling to lead:', error);
      showNotification('Error scrolling to lead.', true);
    }
  }

  /**
   * Escape HTML to prevent XSS
   */
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Show notification message
   */
  function showNotification(message, isError = false) {
    const notification = document.createElement('div');
    notification.className = `notification ${isError ? 'error' : 'success'}`;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
      notification.classList.add('show');
    }, 10);

    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => notification.remove(), 300);
    }, 2000);
  }

  /**
   * Handle pause/resume button click
   */
  pauseResumeBtn.addEventListener('click', async () => {
    currentSettings.isPaused = !currentSettings.isPaused;
    await saveSettings();
    updatePauseResumeButton();
    updateStatus();

    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs[0] && tabs[0].url && tabs[0].url.includes('tradiecore.hipages.com.au')) {
      chrome.tabs.sendMessage(tabs[0].id, {
        type: currentSettings.isPaused ? 'PAUSE_MONITORING' : 'RESUME_MONITORING'
      });
    }
  });

  /**
   * Handle save settings button click
   */
  saveSettingsBtn.addEventListener('click', () => {
    const intervalSeconds = parseInt(refreshIntervalInput.value, 10);
    if (isNaN(intervalSeconds) || intervalSeconds < 3 || intervalSeconds > 300) {
      showNotification('Please enter a valid refresh interval between 3 and 300 seconds.', true);
      return;
    }

    const pauseSeconds = parseInt(pauseAfterClickInput.value, 10);
    if (isNaN(pauseSeconds) || pauseSeconds < 5 || pauseSeconds > 300) {
      showNotification('Please enter a valid pause duration between 5 and 300 seconds.', true);
      return;
    }

    currentSettings.refreshInterval = intervalSeconds * 1000; // Convert to milliseconds
    currentSettings.pauseAfterClick = pauseSeconds * 1000; // Convert to milliseconds
    currentSettings.pauseMode = pauseModeSelect.value || 'reset';
    currentSettings.enableSound = enableSoundCheckbox.checked;
    // Category filters are already updated in real-time, just save
    saveSettings();
  });

  /**
   * Handle add category button click
   */
  addCategoryBtn.addEventListener('click', () => {
    const category = newCategoryInput.value.trim();
    if (category) {
      addCategoryFilter(category);
      saveSettings(); // Save immediately when adding filter
    }
  });

  /**
   * Handle Enter key in category input
   */
  newCategoryInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      const category = newCategoryInput.value.trim();
      if (category) {
        addCategoryFilter(category);
        saveSettings(); // Save immediately when adding filter
      }
    }
  });

  /**
   * Handle clear indicators button click
   */
  clearIndicatorsBtn.addEventListener('click', async () => {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs[0] && tabs[0].url && tabs[0].url.includes('tradiecore.hipages.com.au')) {
      chrome.tabs.sendMessage(tabs[0].id, { type: 'CLEAR_NEW_INDICATORS' }, () => {
        showNotification('New indicators cleared!');
      });
    } else {
      showNotification('Please navigate to a Hipages leads page first.', true);
    }
  });

  /**
   * Listen for messages from content script
   */
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'NEW_LEADS_DETECTED') {
      showNotification(`Found ${message.count} new lead(s)!`, false);
      loadLeads(); // Refresh the leads list
    }
  });

  /**
   * Switch between tabs
   */
  function switchTab(tabName) {
    // Update tab buttons
    tabButtons.forEach(btn => {
      if (btn.getAttribute('data-tab') === tabName) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    // Update tab content
    if (tabName === 'dashboard') {
      dashboardTab.classList.add('active');
      settingsTab.classList.remove('active');
    } else if (tabName === 'settings') {
      dashboardTab.classList.remove('active');
      settingsTab.classList.add('active');
    }
  }

  /**
   * Handle tab button clicks
   */
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const tabName = btn.getAttribute('data-tab');
      switchTab(tabName);
    });
  });

  /**
   * Handle settings icon click
   */
  settingsBtn.addEventListener('click', () => {
    switchTab('settings');
  });

  // Initialize popup
  loadSettings();
  loadLeads();

  // Refresh leads every 2 seconds
  setInterval(loadLeads, 2000);
})();

