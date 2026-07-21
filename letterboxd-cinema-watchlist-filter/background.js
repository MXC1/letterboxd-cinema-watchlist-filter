// Background service worker: periodically syncs Prince Charles Cinema showings
// (watchlist matches OR weekday 5-7pm slots) to a dedicated Google Calendar.
import { normalizeTitle, resolveYear, isWeekdayEvening, extractShowingsFromDocument } from './shared.js';

const PCC_URL = 'https://princecharlescinema.com/whats-on/';
const CALENDAR_NAME = 'Prince Charles Cinema';
const EVENT_DURATION_MINUTES = 150;
const SYNC_ALARM = 'pcc-calendar-sync';
const SYNC_PERIOD_MINUTES = 360;

chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create(SYNC_ALARM, { periodInMinutes: SYNC_PERIOD_MINUTES, delayInMinutes: 1 });
});

chrome.runtime.onStartup.addListener(() => {
  chrome.alarms.create(SYNC_ALARM, { periodInMinutes: SYNC_PERIOD_MINUTES, delayInMinutes: 1 });
});

chrome.alarms.onAlarm.addListener(alarm => {
  if (alarm.name === SYNC_ALARM) {
    runSync().catch(err => console.error('[LBFilter] Scheduled sync failed:', err));
  }
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'pcc-sync-now') {
    runSync()
      .then(result => sendResponse({ ok: true, result }))
      .catch(err => sendResponse({ ok: false, error: String(err && err.message || err) }));
    return true; // keep the message channel open for the async response
  }
  if (msg.type === 'pcc-connect-google') {
    getAuthToken(true)
      .then(() => sendResponse({ ok: true }))
      .catch(err => sendResponse({ ok: false, error: String(err && err.message || err) }));
    return true;
  }
  return false;
});

function getAuthToken(interactive) {
  return new Promise((resolve, reject) => {
    chrome.identity.getAuthToken({ interactive }, token => {
      if (chrome.runtime.lastError || !token) {
        reject(chrome.runtime.lastError || new Error('No auth token returned'));
      } else {
        resolve(token);
      }
    });
  });
}

async function apiFetch(token, url, options = {}) {
  return fetch(url, {
    ...options,
    headers: {
      ...(options.headers || {}),
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
}

async function ensureOffscreenDocument() {
  const existing = await chrome.runtime.getContexts({ contextTypes: ['OFFSCREEN_DOCUMENT'] });
  if (existing.length > 0) return;
  await chrome.offscreen.createDocument({
    url: 'offscreen.html',
    reasons: ['DOM_PARSER'],
    justification: 'Parse Prince Charles Cinema listing HTML fetched in the background'
  });
}

async function parseHtml(html) {
  await ensureOffscreenDocument();
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ type: 'pcc-parse-html', html }, response => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else if (!response || !response.ok) {
        reject(new Error((response && response.error) || 'HTML parse failed'));
      } else {
        resolve(response.showings);
      }
    });
  });
}

async function getCalendarId(token) {
  const stored = await chrome.storage.local.get(['calendarId']);
  if (stored.calendarId) return stored.calendarId;

  const listRes = await apiFetch(token, 'https://www.googleapis.com/calendar/v3/users/me/calendarList?minAccessRole=writer');
  if (!listRes.ok) throw new Error(`Failed to list calendars: ${listRes.status}`);
  const list = await listRes.json();
  const existing = (list.items || []).find(c => c.summary === CALENDAR_NAME);
  if (existing) {
    await chrome.storage.local.set({ calendarId: existing.id });
    return existing.id;
  }

  const createRes = await apiFetch(token, 'https://www.googleapis.com/calendar/v3/calendars', {
    method: 'POST',
    body: JSON.stringify({ summary: CALENDAR_NAME, timeZone: 'Europe/London' })
  });
  const created = await createRes.json();
  if (!created.id) throw new Error('Failed to create calendar: ' + JSON.stringify(created));
  await chrome.storage.local.set({ calendarId: created.id });
  return created.id;
}

function pad(n) {
  return String(n).padStart(2, '0');
}

function toLocalIso(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:00`;
}

function buildEvent(showing, matchReasons, referenceDate) {
  const year = resolveYear(showing.monthIndex, showing.dayOfMonth, referenceDate);
  const start = new Date(year, showing.monthIndex, showing.dayOfMonth, showing.hour, showing.minute);
  const end = new Date(start.getTime() + EVENT_DURATION_MINUTES * 60000);

  return {
    id: `pcc${showing.bookingId}`,
    summary: showing.title,
    location: 'Prince Charles Cinema, 7 Leicester Pl, London WC2H 7BY',
    description:
      `Matched: ${matchReasons.join(', ')}\n` +
      `Booking: https://princecharlescinema.com${showing.bookingHref}\n\n` +
      `End time is estimated (~${EVENT_DURATION_MINUTES} min) — check the listing for the exact runtime.\n\n` +
      `Auto-synced by Letterboxd Cinema Watchlist Filter.`,
    start: { dateTime: toLocalIso(start), timeZone: 'Europe/London' },
    end: { dateTime: toLocalIso(end), timeZone: 'Europe/London' },
    extendedProperties: { private: { pccSync: 'true', pccBookingId: showing.bookingId } }
  };
}

async function runSync() {
  const { watchlist = [], syncEnabled = false } = await chrome.storage.sync.get(['watchlist', 'syncEnabled']);
  if (!syncEnabled) return { skipped: 'Sync is disabled' };

  const token = await getAuthToken(false).catch(() => getAuthToken(true));
  const calendarId = await getCalendarId(token);

  const listingRes = await fetch(PCC_URL, { credentials: 'omit' });
  if (!listingRes.ok) throw new Error(`Failed to fetch listing: ${listingRes.status}`);
  const html = await listingRes.text();
  const showings = await parseHtml(html);

  const normalizedWatchlist = watchlist.map(normalizeTitle);
  const referenceDate = new Date();

  const matched = [];
  for (const showing of showings) {
    const reasons = [];
    if (normalizedWatchlist.includes(normalizeTitle(showing.title))) reasons.push('On your watchlist');
    if (isWeekdayEvening(showing.dayName, showing.hour)) reasons.push('Weekday 5-7pm');
    if (reasons.length > 0) matched.push({ showing, reasons });
  }

  const newIds = new Set(matched.map(m => `pcc${m.showing.bookingId}`));
  const { syncedEventIds = [] } = await chrome.storage.local.get(['syncedEventIds']);

  let created = 0, skipped = 0, failed = 0, deleted = 0;

  for (const { showing, reasons } of matched) {
    const event = buildEvent(showing, reasons, referenceDate);
    const insertRes = await apiFetch(
      token,
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
      { method: 'POST', body: JSON.stringify(event) }
    );
    if (insertRes.status === 200 || insertRes.status === 201) {
      created++;
    } else if (insertRes.status === 409) {
      skipped++; // already synced previously
    } else {
      failed++;
      console.error('[LBFilter] Failed to insert event', event.id, insertRes.status, await insertRes.text());
    }
  }

  const staleIds = syncedEventIds.filter(id => !newIds.has(id));
  for (const id of staleIds) {
    const delRes = await apiFetch(
      token,
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(id)}`,
      { method: 'DELETE' }
    );
    if (delRes.status === 204 || delRes.status === 410 || delRes.status === 404) deleted++;
  }

  await chrome.storage.local.set({
    syncedEventIds: Array.from(newIds),
    lastSync: new Date().toISOString(),
    lastSyncSummary: { matched: matched.length, created, skipped, failed, deleted }
  });

  return { matched: matched.length, created, skipped, failed, deleted };
}
