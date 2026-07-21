const textarea = document.getElementById('watchlist');
const fetchBtn = document.getElementById('fetch');
const statusDiv = document.getElementById('status');
const usernameInput = document.getElementById('username');
const lastFetchedDiv = document.getElementById('last-fetched');
const syncEnabledCheckbox = document.getElementById('sync-enabled');
const connectGoogleBtn = document.getElementById('connect-google');
const syncNowBtn = document.getElementById('sync-now');
const calendarStatusDiv = document.getElementById('calendar-status');

// Load watchlist and last fetched date on popup open
chrome.storage.sync.get(['watchlist', 'lbUsername', 'lastFetched', 'syncEnabled'], (result) => {
  if (result.watchlist) {
    textarea.value = result.watchlist.join('\n');
  }
  if (result.lbUsername) {
    usernameInput.value = result.lbUsername;
  }
  if (result.lastFetched) {
    lastFetchedDiv.textContent = 'Last fetched: ' + result.lastFetched;
  }
  syncEnabledCheckbox.checked = !!result.syncEnabled;
});

refreshCalendarStatus();

syncEnabledCheckbox.addEventListener('change', () => {
  chrome.storage.sync.set({ syncEnabled: syncEnabledCheckbox.checked });
});

connectGoogleBtn.addEventListener('click', () => {
  calendarStatusDiv.textContent = 'Opening Google sign-in...';
  chrome.runtime.sendMessage({ type: 'pcc-connect-google' }, (response) => {
    if (response && response.ok) {
      calendarStatusDiv.textContent = 'Google account connected.';
    } else {
      calendarStatusDiv.textContent = 'Failed to connect: ' + (response && response.error);
    }
  });
});

syncNowBtn.addEventListener('click', () => {
  calendarStatusDiv.textContent = 'Syncing...';
  chrome.runtime.sendMessage({ type: 'pcc-sync-now' }, (response) => {
    if (response && response.ok) {
      const r = response.result;
      if (r.skipped) {
        calendarStatusDiv.textContent = r.skipped;
      } else {
        calendarStatusDiv.textContent =
          `Synced ${r.matched} showing(s): ${r.created} added, ${r.skipped} already synced, ${r.deleted} removed` +
          (r.failed ? `, ${r.failed} failed` : '') + '.';
      }
    } else {
      calendarStatusDiv.textContent = 'Sync failed: ' + (response && response.error);
    }
  });
});

function refreshCalendarStatus() {
  chrome.storage.local.get(['lastSync', 'lastSyncSummary'], (result) => {
    if (result.lastSync) {
      const r = result.lastSyncSummary || {};
      const when = new Date(result.lastSync).toLocaleString();
      calendarStatusDiv.textContent =
        `Last synced: ${when} — ${r.matched || 0} showing(s), ${r.created || 0} added.`;
    }
  });
}

fetchBtn.addEventListener('click', async () => {
  const username = usernameInput.value.trim();
  console.log('Fetch button clicked. Username:', username);
  if (!username) {
    statusDiv.textContent = 'Please enter your Letterboxd username.';
    console.warn('No username entered');
    return;
  }
  statusDiv.textContent = 'Fetching watchlist...';
  console.log('Fetching watchlist for:', username);
  chrome.storage.sync.set({ lbUsername: username });
  try {
    let films = new Set();
    for (let page = 1; page <= 50; page++) {
      const url = `https://letterboxd.com/${username}/watchlist/page/${page}`;
      let res;
      try {
        // credentials: 'omit' avoids sending the logged-in session cookie, which would
        // cause Letterboxd to apply the account's saved watchlist visibility filters
        // (Sort/Service/Genre/Decade) and silently return a truncated list.
        res = await fetch(url, { credentials: 'omit' });
        console.log('Fetched URL:', url, 'Status:', res.status);
      } catch (fetchErr) {
        console.error('Fetch error:', fetchErr, 'URL:', url);
        throw fetchErr;
      }
      if (!res.ok) {
        console.error('Non-OK response:', res.status, res.statusText, 'URL:', url);
        break;
      }
      const html = await res.text();
      const div = document.createElement('div');
      div.innerHTML = html;
      let found = false;
      div.querySelectorAll('div.react-component').forEach(el => {
        const name = el.getAttribute('data-item-name');
        if (name) {
          films.add(name.replace(/\s*\(\d{4}\)$/, ''));
          found = true;
        }
      });
      console.log('Page', page, 'Found:', found, 'Films so far:', films.size);
      if (!found) {
        console.warn('No films found on page', page, 'URL:', url);
        break;
      }
    }
    if (films.size === 0) {
      statusDiv.textContent = 'No films found or profile is private.';
      console.warn('No films found for user:', username);
      return;
    }
    textarea.value = Array.from(films).join('\n');
    const now = new Date();
    const dateStr = now.toLocaleString();
    chrome.storage.sync.set({ watchlist: Array.from(films), lastFetched: dateStr }, () => {
      statusDiv.textContent = `Fetched and saved ${films.size} films!`;
      lastFetchedDiv.textContent = 'Last fetched: ' + dateStr;
      console.log('Fetched and saved films:', Array.from(films));
      setTimeout(() => { statusDiv.textContent = ''; }, 2500);
    });
  } catch (e) {
    statusDiv.textContent = 'Error fetching watchlist.';
    console.error('Error fetching watchlist:', e);
  }
  console.log('StatusDiv:', statusDiv.textContent);
});
