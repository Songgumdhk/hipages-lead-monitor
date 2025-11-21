# Hipages Lead Monitor Chrome Extension

A Chrome extension that monitors Hipages lead pages in real-time for customizable job categories. The extension automatically refreshes the page, detects new leads, highlights them with visual indicators, plays sound notifications, and provides a comprehensive dashboard for managing leads.

## Features

### Core Functionality

- ✅ **Customizable Category Filtering**: Monitor any job category (default: "Rental Bond Cleaning")
- ✅ **Multiple Category Support**: Add and monitor multiple categories simultaneously
- ✅ **Accept Button Filtering**: Only displays leads with "Accept" buttons (excludes "Join Waitlist")
- ✅ **Auto-Refresh**: Automatically refreshes the page at configurable intervals (default: 5 seconds, range: 3-300 seconds)
- ✅ **New Lead Detection**: Compares current leads with previous ones and marks new additions
- ✅ **Visual Indicators on Page**: Highlights new leads with green border, glow effect, and "NEW" badge
- ✅ **Red Dot Indicator in Popup**: Shows a pulsing red dot next to newly detected leads in the Current Leads tab for 1 minute
- ✅ **Sound Notifications**: Plays a 3-second beep sound when new leads are detected (configurable)
- ✅ **Pause/Resume**: Pause monitoring without losing tracked leads
- ✅ **Multiple Pause Modes**: Choose how pause timer behaves on multiple clicks (Reset, Extend, Max)
- ✅ **Click to Navigate**: Click any lead in the popup to automatically scroll to it on the page
- ✅ **Auto-Pause on Click**: Automatically pauses monitoring when you click a lead (configurable duration)

### Dashboard & Interface

- ✅ **Popup Dashboard**: Comprehensive interface with Dashboard and Settings tabs
- ✅ **Real-time Lead List**: View all current matching leads with details
- ✅ **Lead Information Display**: Shows customer name, status, category, location, date, and lead ID
- ✅ **Status Indicators**: Visual status dots showing monitoring state (Active/Paused)
- ✅ **Lead Counter**: Displays total number of matching leads found
- ✅ **Settings Management**: Easy-to-use settings interface with category management
- ✅ **Clear Indicators Button**: Remove all "NEW" visual indicators from the page

### Advanced Features

- ✅ **Persistent Storage**: All settings and lead tracking persist across browser sessions
- ✅ **First Seen Tracking**: Tracks when each lead was first detected for red dot display
- ✅ **Smart Lead Comparison**: Efficiently compares leads to detect new ones without duplicates
- ✅ **Error Handling**: Robust error handling with user-friendly error messages

## Installation

### Step 1: Download the Extension

1. Download or clone this repository to your computer
2. Ensure all files are in a single folder

### Step 2: Create Extension Icons

The extension requires three icon files. Create simple PNG icons (16x16, 48x48, 128x128 pixels) or use placeholder images:

- `icon16.png` - 16x16 pixels
- `icon48.png` - 48x48 pixels  
- `icon128.png` - 128x128 pixels

**Quick Icon Creation**: You can create simple colored square icons with text "HL" (Hipages Lead) or use any image editor. Alternatively, you can use online icon generators.

### Step 3: Load Extension in Chrome

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (toggle in the top-right corner)
3. Click "Load unpacked"
4. Select the folder containing all extension files
5. The extension should now appear in your extensions list

### Step 4: Pin the Extension (Optional)

1. Click the extensions icon (puzzle piece) in Chrome toolbar
2. Click the pin icon next to "Hipages Lead Monitor" to pin it to your toolbar

## Usage

### Basic Usage

1. Navigate to the Hipages leads page: `https://tradiecore.hipages.com.au/leads`
2. The extension will automatically start monitoring when the page loads
3. New leads matching the criteria will be:
   - Highlighted on the page with:
     - Green border around the lead card
     - "NEW" badge indicator
     - Pulsing animation effect
   - Displayed in the popup with a red dot indicator (for 1 minute)
   - Trigger a beep sound notification (if enabled)

### Using the Popup Interface

1. Click the extension icon in your Chrome toolbar
2. The popup has two tabs:
   - **Dashboard Tab**: View current leads and monitoring status
   - **Settings Tab**: Configure all extension settings

#### Dashboard Tab Features

- **Status Indicator**: Shows current monitoring status with colored dot (Green = Active, Orange = Paused)
- **Lead Count**: Total number of matching leads found
- **Current Leads List**: Displays all matching leads with:
  - Customer name (with red dot indicator if newly detected within 1 minute)
  - Lead status badge
  - Category, location, and date
  - Lead ID
  - Click any lead to scroll to it on the page

#### Settings Tab Features

- **Category Filters**: Add/remove job categories to monitor
- **Refresh Interval**: Set auto-refresh time (3-300 seconds)
- **Pause After Click**: Configure how long to pause monitoring after clicking a lead (5-300 seconds)
- **Multiple Clicks Behavior**: Choose pause timer behavior:
  - **Reset Timer**: Start fresh 20s countdown
  - **Extend Timer**: Add 20s to remaining time
  - **Use Maximum**: Keep the longer duration
- **Sound Notifications**: Toggle beep sound for new leads
- **Pause/Resume Button**: Manually pause or resume monitoring
- **Clear Indicators Button**: Remove all "NEW" badges from the page

### Adjusting Settings

1. Open the popup by clicking the extension icon
2. Click the "Settings" tab
3. Configure your preferences:
   - Add/remove category filters
   - Set refresh interval (3-300 seconds)
   - Configure pause after click duration
   - Choose pause mode behavior
   - Enable/disable sound notifications
4. Click "Save Settings" to apply changes
5. Settings are saved automatically and persist across sessions

### Pausing Monitoring

1. Click "Pause" in the popup to temporarily stop auto-refresh
2. Click "Resume" to continue monitoring
3. Paused state persists across page refreshes

### Adding Category Filters

1. Open the popup and go to the Settings tab
2. In the "Category Filters" section, type a category name (e.g., "Rental Bond Cleaning")
3. Click "Add" or press Enter
4. The category will be added to your filter list
5. Click the "×" button next to any category to remove it

### Managing Sound Notifications

1. Open the popup and go to the Settings tab
2. Check/uncheck "Play beep sound for new leads"
3. Click "Save Settings"
4. When enabled, a 3-second beep will play when new leads are detected

### Using Multiple Pause Modes

The extension offers three pause modes for handling multiple lead clicks:

- **Reset Timer**: Each click resets the pause timer to the full duration
- **Extend Timer**: Each click adds the pause duration to the remaining time
- **Use Maximum**: Keeps whichever pause duration is longer

1. Go to Settings tab
2. Select your preferred mode from the dropdown
3. Click "Save Settings"

### Clearing "NEW" Indicators

1. Open the popup
2. Click "Clear 'NEW' Indicators" button (available in both tabs)
3. All visual indicators will be removed from the page
4. Leads will still be tracked, but won't show as "new" anymore
5. Red dots in the popup will remain until 1 minute has passed since first detection

## How It Works

### Lead Detection

The extension:
1. Scans all lead cards on the page (`article[data-tracking-label="Lead card"]`)
2. Extracts lead information including:
   - Lead ID (from accept link)
   - Category/Job type
   - Status (Waitlist/Available/other)
   - Customer name
   - Location
   - Timestamp
3. Filters leads matching:
   - Category matches any of the configured category filters (case-insensitive partial match)
   - Has an "Accept" button (excludes "Join Waitlist" buttons)
   - Only leads with Accept buttons are displayed (regardless of status)

### New Lead Detection

1. On first load, all matching leads are stored in Chrome storage
2. After each refresh, current leads are compared with stored leads
3. Leads with IDs not in storage are marked as "NEW" and:
   - Get visual indicators on the page (green border, "NEW" badge, glow effect)
   - Get a first-seen timestamp recorded
   - Trigger beep sound notification (if enabled)
   - Show red dot in popup Current Leads tab for 1 minute
4. Current leads are saved to storage for next comparison

### Sound Notifications

- Plays a 3-second beep sound when new leads are detected
- Sound only plays once per lead (tracked separately from visual indicators)
- Can be enabled/disabled in Settings
- Uses Web Audio API for reliable sound playback

### Red Dot Indicator

- Newly detected leads show a pulsing red dot next to the customer name in the popup
- Red dot appears for exactly 1 minute after the lead is first detected
- Automatically disappears after 1 minute
- Helps quickly identify recently added leads at a glance

### Auto-Refresh

- The extension automatically refreshes the page at the configured interval (default: 5 seconds)
- Refresh can be paused/resumed via the popup
- Automatically pauses after clicking a lead (configurable duration: 5-300 seconds)
- Supports multiple pause modes for handling rapid clicks
- Settings persist across browser sessions

### Data Storage

The extension stores data locally using Chrome Storage API:
- **Monitored Leads**: Lead IDs and basic info for comparison
- **First Seen Timestamps**: When each lead was first detected (for red dot display)
- **Sounded Leads**: List of leads that have already played sound
- **Settings**: All user preferences and configuration
- All data stays on your device - nothing is sent to external servers

## File Structure

```
hipages-lead-monitor/
├── manifest.json          # Extension manifest (Manifest V3)
├── content.js             # Content script (runs on Hipages pages)
├── popup.html             # Popup interface HTML
├── popup.js               # Popup JavaScript logic
├── popup.css              # Popup styles
├── styles.css             # Content script styles (for NEW indicators)
├── icon16.png             # Extension icon (16x16)
├── icon48.png             # Extension icon (48x48)
├── icon128.png            # Extension icon (128x128)
└── README.md              # This file
```

## Technical Details

### Manifest V3 Compliance

- Uses Manifest V3 for Chrome compatibility
- Content script runs on `tradiecore.hipages.com.au/leads*` pages
- Uses Chrome Storage API for persistence
- Message passing between popup and content script

### Permissions

- `storage`: To save leads and settings
- `activeTab`: To interact with the current tab
- `host_permissions`: Access to Hipages domain

### Browser Compatibility

- Chrome (recommended)
- Edge (Chromium-based)
- Other Chromium-based browsers

## Troubleshooting

### Extension Not Working

1. **Check if you're on the correct page**: The extension only works on `tradiecore.hipages.com.au/leads` pages
2. **Refresh the page**: Sometimes the content script needs a page refresh to initialize
3. **Check extension is enabled**: Go to `chrome://extensions/` and ensure the extension is enabled
4. **Check browser console**: Open DevTools (F12) and check for any error messages

### No Leads Detected

1. **Verify category filters**: Check Settings tab to ensure correct categories are configured
2. **Check Accept button**: Leads must have "Accept" buttons (not "Join Waitlist")
3. **Check popup**: Open the popup to see if leads are detected (may take a few seconds)
4. **Verify page**: Ensure you're on a Hipages leads page with matching leads

### Auto-Refresh Not Working

1. **Check if paused**: Open popup and verify monitoring is not paused
2. **Verify interval**: Ensure refresh interval is set correctly (minimum 3 seconds)
3. **Check settings**: Save settings again if needed
4. **Check pause after click**: Verify pause duration isn't too long

### Sound Not Playing

1. **Check if enabled**: Verify "Play beep sound for new leads" is checked in Settings
2. **Browser volume**: Ensure browser/system volume is not muted
3. **Already played**: Sound only plays once per lead
4. **Check console**: Open DevTools console for error messages

### Red Dot Not Appearing

1. **Time limit**: Red dot only shows for 1 minute after lead is first detected
2. **Refresh popup**: The popup refreshes every 2 seconds, red dot should appear automatically
3. **Check first detection**: Only newly detected leads (not previously stored) get red dots

### "NEW" Indicators Not Appearing

1. **Clear storage**: The extension may have already marked leads as "seen"
2. **Refresh page**: New indicators appear after page refresh when new leads are detected
3. **Check filter**: Ensure leads match the configured category filters
4. **Check Accept button**: Only leads with Accept buttons are displayed

## Customization

### Changing Category Filters

**Recommended Method**: Use the Settings tab in the popup interface to add/remove categories dynamically. This is the easiest and most flexible approach.

**Manual Method** (if needed): Edit `content.js`:

```javascript
const DEFAULT_CATEGORY_FILTERS = ['Rental Bond Cleaning', 'Your Category Here'];
```

### Adjusting Default Settings

Edit `content.js` to change defaults:

```javascript
const DEFAULT_REFRESH_INTERVAL = 5000; // Change to desired milliseconds
const DEFAULT_PAUSE_AFTER_CLICK = 20000; // Change pause duration in milliseconds
```

### Customizing Beep Sound

Edit `content.js` in the `playBeep()` function:

```javascript
oscillator.frequency.value = 800; // Change frequency (Hz) for different pitch
oscillator.stop(audioContext.currentTime + 3.0); // Change duration (seconds)
```

### Changing Red Dot Duration

Edit `popup.js` in the `displayLeads()` function:

```javascript
const oneMinute = 60 * 1000; // Change to desired milliseconds (e.g., 2 * 60 * 1000 for 2 minutes)
```

## Privacy & Security

- **No Data Collection**: The extension only stores lead IDs, timestamps, and settings locally in your browser
- **No External Communication**: All data stays on your device - nothing is sent to external servers
- **No Tracking**: The extension doesn't track your browsing habits or send data anywhere
- **Local Storage Only**: Uses Chrome's local storage API (data stays on your computer)
- **No Analytics**: The extension doesn't use any analytics or tracking services
- **Open Source**: You can review all code to verify privacy claims
- **Permissions**: Only requests minimal necessary permissions (storage, activeTab, host_permissions for Hipages domain)

## Limitations

- **Page Structure Dependency**: Requires the Hipages page structure to remain consistent
- **Updates Needed**: May need updates if Hipages changes their HTML structure
- **Page Reload**: Auto-refresh reloads the entire page (may interrupt your workflow)
- **Domain Specific**: Extension only works on Hipages lead pages (`tradiecore.hipages.com.au/leads*`)
- **Sound Limitations**: Beep sound requires browser tab to be active (Chrome may throttle sounds in background tabs)
- **Storage Limits**: Chrome storage has size limits (unlikely to be reached with normal usage)

## Support

If you encounter issues:

1. Check the browser console (F12) for error messages
2. Verify you're on the correct Hipages page
3. Try disabling and re-enabling the extension
4. Check that all files are present in the extension folder

## License

This extension is provided as-is for personal use. Modify and distribute as needed.

## Version History

### v2.0.0 (Current)
- ✅ Multiple category filter support
- ✅ Accept button filtering (excludes Join Waitlist)
- ✅ Sound notifications (3-second beep for new leads)
- ✅ Red dot indicator in popup for newly detected leads (1 minute duration)
- ✅ Multiple pause modes (Reset, Extend, Max)
- ✅ Enhanced Settings tab with comprehensive options
- ✅ Click to scroll to lead on page
- ✅ Auto-pause on lead click with configurable duration
- ✅ First seen timestamp tracking
- ✅ Improved UI with Dashboard and Settings tabs
- ✅ Better error handling and user feedback

### v1.0.0 (Initial Release)
- Basic lead monitoring
- Single category filtering
- Auto-refresh functionality
- New lead detection
- Popup interface
- Visual indicators on page
- Pause/Resume functionality

## Future Enhancements

Potential improvements:
- Email/SMS alerts for new leads
- Lead history tracking and statistics
- Export leads to CSV/Excel
- Customizable highlight colors
- Background monitoring (without page refresh)
- Desktop notifications
- Lead priority/importance marking
- Custom sound file support

---

**Note**: This extension is not affiliated with or endorsed by Hipages. It's an independent tool for monitoring leads on the Hipages platform.

