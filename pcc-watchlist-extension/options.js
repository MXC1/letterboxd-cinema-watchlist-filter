// options.js
// Handles the options page functionality

// Loads saved options from Chrome storage
function loadOptions() {
  chrome.storage.sync.get(['watchlist', 'lbUsername', 'lastFetched'], (result) => {
    if (result.watchlist) {
      document.getElementById('watchlist').value = result.watchlist.join('\n');
    }
    if (result.lbUsername) {
      document.getElementById('username').value = result.lbUsername;
    }
    if (result.lastFetched) {
      document.getElementById('last-fetched').textContent = 'Last fetched: ' + result.lastFetched;
    }
  });
}

// Saves the watchlist to Chrome storage
function saveOptions(event) {
  event.preventDefault();
  const watchlist = document.getElementById('watchlist').value.split('\n');
  chrome.storage.sync.set({ watchlist }, () => {
    alert('Options saved!');
  });
}

// Fetches the watchlist from Letterboxd
async function fetchWatchlist() {
  const username = document.getElementById('username').value.trim();
  const statusDiv = document.getElementById('status');

  if (!username) {
    statusDiv.textContent = 'Please enter your Letterboxd username.';
    return;
  }

  statusDiv.textContent = 'Fetching watchlist...';
  chrome.storage.sync.set({ lbUsername: username });

  try {
    const films = await fetchFilmsFromLetterboxd(username);
    chrome.storage.sync.set({ watchlist: Array.from(films), lastFetched: new Date().toLocaleString() }, () => {
      statusDiv.textContent = 'Watchlist fetched successfully!';
      loadOptions();
    });
  } catch (error) {
    statusDiv.textContent = 'Failed to fetch watchlist. Please try again.';
    console.error('Error fetching watchlist:', error);
  }
}

// Fetches films from Letterboxd pages
async function fetchFilmsFromLetterboxd(username) {
  const films = new Set();

  for (let page = 1; page <= 10; page++) {
    const url = `https://corsproxy.io/?https://letterboxd.com/${username}/watchlist/page/${page}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to fetch page ${page}: ${response.statusText}`);
    }

    const html = await response.text();
    const div = document.createElement('div');
    div.innerHTML = html;

    const filmTitles = Array.from(div.querySelectorAll('.film-title-wrapper a')).map((a) => a.textContent.trim());
    filmTitles.forEach((title) => films.add(title));

    if (filmTitles.length === 0) break; // Stop if no films are found on the page
  }

  return films;
}

// Sets up event listeners for the options page
function setupEventListeners() {
  document.getElementById('options-form').addEventListener('submit', saveOptions);
  document.getElementById('fetch').addEventListener('click', fetchWatchlist);
}

// Initializes the options page
function initializeOptionsPage() {
  loadOptions();
  setupEventListeners();
}

document.addEventListener('DOMContentLoaded', initializeOptionsPage);