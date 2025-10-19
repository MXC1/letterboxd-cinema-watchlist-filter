# Letterboxd Cinema Watchlist Filter

Letterboxd Cinema Watchlist Filter is a Chrome extension that enhances your movie-going experience by filtering the "What's On" pages of popular cinema websites to show only films from your Letterboxd watchlist.

## Features
- **Cinema Support**: Works with Prince Charles Cinema, Cineworld, Odeon, and Vue.
- **Letterboxd Integration**: Fetches your watchlist directly from your Letterboxd account.
- **Custom Filtering**: Filters cinema listings to display only movies in your watchlist.

## Installation
1. Clone this repository or download it as a ZIP file.
2. Open Chrome and navigate to `chrome://extensions/`.
3. Enable "Developer mode" in the top-right corner.
4. Click "Load unpacked" and select the folder containing this extension.

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

### File Structure
- `manifest.json`: Chrome extension configuration.
- `background.js`: Background script for handling events.
- `content.js`: Content script for filtering cinema listings.
- `popup.html`: HTML for the extension popup.
- `popup.js`: JavaScript for the popup functionality.