// Shared parsing helpers used by background.js and offscreen.js for calendar sync.

export const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

export const MONTHS = {
  january: 0, february: 1, march: 2, april: 3, may: 4, june: 5,
  july: 6, august: 7, september: 8, october: 9, november: 10, december: 11
};

export function stripYear(title) {
  return title.replace(/\s*\(\d{4}\)$/, '');
}

export function normalizeTitle(title) {
  return title
    .replace(/…/g, '...')
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/–/g, '-')
    .replace(/—/g, '-')
    .replace(/\.{2,}$/, '')
    .toLowerCase()
    .trim();
}

// "Tuesday 21st July" -> { dayName: "Tuesday", dayOfMonth: 21, monthIndex: 6 }
export function parseHeadingDate(headingText) {
  const m = headingText.trim().match(/^([A-Za-z]+)\s+(\d{1,2})\w*\s+([A-Za-z]+)$/);
  if (!m) return null;
  const [, dayName, dayOfMonth, monthName] = m;
  const monthIndex = MONTHS[monthName.toLowerCase()];
  if (monthIndex === undefined) return null;
  return { dayName, dayOfMonth: parseInt(dayOfMonth, 10), monthIndex };
}

// "5:30 pm" -> { hour: 17, minute: 30 }
export function parseTimeText(timeText) {
  const m = timeText.trim().match(/(\d{1,2}):(\d{2})\s*(am|pm)/i);
  if (!m) return null;
  let hour = parseInt(m[1], 10);
  const minute = parseInt(m[2], 10);
  const period = m[3].toLowerCase();
  if (period === 'pm' && hour !== 12) hour += 12;
  if (period === 'am' && hour === 12) hour = 0;
  return { hour, minute };
}

// The listing page never prints a year, so infer it relative to today: if the
// month/day already happened more than a few days ago this year, it must mean next year.
export function resolveYear(monthIndex, dayOfMonth, referenceDate) {
  const refYear = referenceDate.getFullYear();
  const candidate = new Date(refYear, monthIndex, dayOfMonth);
  const diffDays = (candidate - referenceDate) / 86400000;
  return diffDays < -3 ? refYear + 1 : refYear;
}

export function isWeekdayEvening(dayName, hour) {
  return WEEKDAYS.includes(dayName) && hour >= 17 && hour < 19;
}

// Walks a parsed Prince Charles Cinema "what's on" document and returns every
// individual showing as a flat list: { title, dayName, dayOfMonth, monthIndex, hour, minute, bookingId, bookingHref }
export function extractShowingsFromDocument(doc) {
  const showings = [];
  const filmBlocks = doc.querySelectorAll('div.film_list-outer');

  filmBlocks.forEach(filmBlock => {
    const parentEvent = filmBlock.closest('.jacro-event') || filmBlock;
    const titleEl = parentEvent.querySelector('.liveeventtitle');
    if (!titleEl) return;
    const title = stripYear(titleEl.textContent.trim());

    const perfList = filmBlock.querySelector('.performance-list-items');
    if (!perfList) return;

    let currentDate = null;
    for (const child of perfList.children) {
      if (child.classList.contains('heading')) {
        currentDate = parseHeadingDate(child.textContent);
      } else if (child.tagName === 'LI' && currentDate) {
        const timeEl = child.querySelector('.time');
        const linkEl = child.querySelector('a[href]');
        if (!timeEl || !linkEl) continue;

        const time = parseTimeText(timeEl.textContent);
        if (!time) continue;

        const hrefMatch = linkEl.getAttribute('href').match(/(\d+)\s*$/);
        if (!hrefMatch) continue;

        showings.push({
          title,
          dayName: currentDate.dayName,
          dayOfMonth: currentDate.dayOfMonth,
          monthIndex: currentDate.monthIndex,
          hour: time.hour,
          minute: time.minute,
          bookingId: hrefMatch[1],
          bookingHref: linkEl.getAttribute('href')
        });
      }
    }
  });

  return showings;
}
