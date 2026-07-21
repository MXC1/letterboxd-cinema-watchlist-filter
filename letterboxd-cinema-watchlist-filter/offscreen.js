// Runs inside the offscreen document, which (unlike the background service worker)
// has DOMParser available, so fetched PCC listing HTML can be parsed into a real Document.
import { extractShowingsFromDocument } from './shared.js';

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type !== 'pcc-parse-html') return false;

  try {
    const doc = new DOMParser().parseFromString(msg.html, 'text/html');
    const showings = extractShowingsFromDocument(doc);
    sendResponse({ ok: true, showings });
  } catch (err) {
    sendResponse({ ok: false, error: String(err) });
  }
  return true;
});
