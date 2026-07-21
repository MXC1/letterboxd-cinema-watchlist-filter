# Letterboxd Cinema Watchlist Filter

Letterboxd Cinema Watchlist Filter is a Chrome extension that enhances your movie-going experience by filtering the "What's On" pages of popular cinema websites to show only films from your Letterboxd watchlist.

## Features
- **Cinema Support**: Works with Prince Charles Cinema, Cineworld, Odeon, and Vue.
- **Letterboxd Integration**: Fetches your watchlist directly from your Letterboxd account.
- **Custom Filtering**: Filters cinema listings to display only movies in your watchlist.
- **Google Calendar Sync**: Automatically adds Prince Charles Cinema showings that are on your
  watchlist, or that fall on a weekday between 5-7pm, to a dedicated "Prince Charles Cinema"
  Google Calendar. Runs in the background every 6 hours once enabled.

## Installation
1. Clone this repository or download it as a ZIP file.
2. Open Chrome and navigate to `chrome://extensions/`.
3. Enable "Developer mode" in the top-right corner.
4. Click "Load unpacked" and select the folder containing this extension.

The extension ID is pinned via the `key` field in `manifest.json`, so it will always load as
`dmnahaacdahabjngfopbpfiimkalmlke` regardless of where you check it out — this is required for
the Google Calendar OAuth setup below.

## Usage
1. Click the extension icon in the Chrome toolbar to open the popup.
2. Enter your Letterboxd username and click "Fetch Watchlist".
3. Navigate to the "What's On" page of a supported cinema website.
4. The extension will automatically filter the listings to match your watchlist.

## Supported Websites
- [Prince Charles Cinema](https://princecharlescinema.com/whats-on/)
- [Cineworld](https://www.cineworld.co.uk/cinemas/)
- [Odeon](https://www.odeon.co.uk/cinemas/)
- [Vue](https://www.myvue.com/)

## Google Calendar Sync Setup

This is a one-time setup you need to do yourself in your own Google account — the extension
can't create Google Cloud/OAuth resources on your behalf.

1. Go to the [Google Cloud Console](https://console.cloud.google.com/), create a new project
   (or reuse one), and enable the **Google Calendar API** (APIs & Services > Library).
2. Under APIs & Services > OAuth consent screen, configure it (External is fine) and add your
   own Google account email as a test user.
3. Under APIs & Services > Credentials, click **Create Credentials > OAuth client ID**.
   - Application type: **Chrome Extension**
   - Application ID: `dmnahaacdahabjngfopbpfiimkalmlke`
4. Copy the generated Client ID (ends in `.apps.googleusercontent.com`).
5. Open `letterboxd-cinema-watchlist-filter/manifest.json` and replace
   `REPLACE_WITH_YOUR_OAUTH_CLIENT_ID.apps.googleusercontent.com` in the `oauth2.client_id`
   field with the Client ID you copied.
6. Reload the extension in `chrome://extensions/`.
7. Open the extension popup, toggle **Enable auto-sync**, click **Connect Google Account** and
   approve the consent screen, then click **Sync Now** to test it.

Once connected, sync runs automatically in the background roughly every 6 hours, creating a
"Prince Charles Cinema" calendar and keeping it up to date (adding new matches, removing ones
that no longer match — e.g. after you edit your watchlist). Showing end times are estimated
(~2.5 hours) since the listing page doesn't publish exact runtimes.

### File Structure
- `manifest.json`: Chrome extension configuration.
- `background.js`: Background service worker — schedules and runs the Google Calendar sync.
- `shared.js`: Parsing helpers shared between `background.js` and `offscreen.js`.
- `offscreen.js` / `offscreen.html`: Offscreen document used to parse fetched listing HTML
  (service workers have no DOM/DOMParser of their own).
- `content.js`: Content script for filtering cinema listings.
- `popup.html`: HTML for the extension popup.
- `popup.js`: JavaScript for the popup functionality, including calendar sync controls.