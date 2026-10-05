import { google } from 'googleapis';
import { config } from '../config.js';

const auth = new google.auth.GoogleAuth({
  keyFile: config.googleCredentialsPath,
  scopes: ['https://www.googleapis.com/auth/calendar.events'],
});

const calendar = google.calendar({ version: 'v3', auth });

/**
 * Calculates start and end of day in Asia/Kolkata timezone
 */
export function resolveDateRange(target) {
  // Get current date parts in Indian Standard Time (IST)
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  
  // Format returns YYYY-MM-DD
  const todayStr = formatter.format(new Date());
  const [year, month, day] = todayStr.split('-').map(Number);

  const baseDate = new Date(Date.UTC(year, month - 1, day));

  if (target === 'tomorrow') {
    baseDate.setUTCDate(baseDate.getUTCDate() + 1);
  } else if (target !== 'today' && target.match(/^\d{4}-\d{2}-\d{2}$/)) {
    const [y, m, d] = target.split('-').map(Number);
    baseDate.setUTCFullYear(y, m - 1, d);
  }

  // Construct ISO strings with +05:30 IST offset
  const targetYear = baseDate.getUTCFullYear();
  const targetMonth = String(baseDate.getUTCMonth() + 1).padStart(2, '0');
  const targetDay = String(baseDate.getUTCDate()).padStart(2, '0');
  const dateFormatted = `${targetYear}-${targetMonth}-${targetDay}`;

  const timeMin = `${dateFormatted}T00:00:00+05:30`;
  const timeMax = `${dateFormatted}T23:59:59+05:30`;

  return { timeMin, timeMax, dateFormatted };
}

/**
 * Fetch events within an exact time window
 */
export async function getCalendarEvents(timeMin, timeMax) {
  try {
    const res = await calendar.events.list({
      calendarId: config.calendarId,
      timeMin,
      timeMax,
      singleEvents: true,
      orderBy: 'startTime',
      maxResults: 15,
    });

    const items = res.data.items || [];
    return items.map((event) => ({
      id: event.id,
      summary: event.summary || 'Busy',
      start: event.start.dateTime || event.start.date,
      end: event.end.dateTime || event.end.date,
    }));
  } catch (error) {
    console.error('Google Calendar API Error:', error.message);
    throw error;
  }
}