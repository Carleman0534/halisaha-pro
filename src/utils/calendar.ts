import { Match } from '../types';

/**
 * Format date and time for iCalendar / Google Calendar
 * Input: match.date "YYYY-MM-DD", match.time "21:00 - 22:00"
 */
function parseMatchDateTime(dateStr: string, timeStr: string) {
  try {
    const [startTimeStr, endTimeStr] = timeStr.split('-').map(s => s.trim());
    const [startH, startM] = (startTimeStr || '21:00').split(':').map(Number);
    const [endH, endM] = (endTimeStr || '22:00').split(':').map(Number);

    const [year, month, day] = dateStr.split('-').map(Number);

    const start = new Date(year, month - 1, day, startH, startM, 0);
    const end = new Date(year, month - 1, day, endH, endM, 0);

    return { start, end };
  } catch {
    const now = new Date();
    return { start: now, end: new Date(now.getTime() + 3600000) };
  }
}

function formatIsoForCalendar(d: Date): string {
  // YYYYMMDDTHHmmSS
  const pad = (n: number) => n.toString().padStart(2, '0');
  return (
    d.getFullYear() +
    pad(d.getMonth() + 1) +
    pad(d.getDate()) +
    'T' +
    pad(d.getHours()) +
    pad(d.getMinutes()) +
    pad(d.getSeconds())
  );
}

/**
 * Generate Google Calendar Event URL
 */
export function generateGoogleCalendarUrl(match: Match): string {
  const { start, end } = parseMatchDateTime(match.date, match.time);
  const startIso = formatIsoForCalendar(start);
  const endIso = formatIsoForCalendar(end);

  const title = encodeURIComponent(`⚽ Halı Saha Maçı (${match.matchFormat || '7v7'})`);
  const details = encodeURIComponent(
    `⚽ Halı Saha Maçı\n📍 Saha: ${match.venueName} (${match.pitchNo})\n💰 Kişi Başı: ${match.costPerPlayer} ₺\n👥 Format: ${match.matchFormat || '7v7'}\nLütfen maç saatinden 15 dakika önce hazır olun!`
  );
  const location = encodeURIComponent(`${match.venueName}, ${match.pitchNo}`);

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startIso}/${endIso}&details=${details}&location=${location}`;
}

/**
 * Generate standard .ics (iCalendar) content for Apple Calendar / Outlook / Android
 */
export function generateIcsContent(match: Match): string {
  const { start, end } = parseMatchDateTime(match.date, match.time);
  const startIso = formatIsoForCalendar(start);
  const endIso = formatIsoForCalendar(end);
  const nowIso = formatIsoForCalendar(new Date());

  return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Halisaha Pro//TR
CALSCALE:GREGORIAN
METHOD:PUBLISH
BEGIN:VEVENT
UID:match_${match.id || Date.now()}@halisaha.pro
DTSTAMP:${nowIso}Z
DTSTART:${startIso}
DTEND:${endIso}
SUMMARY:⚽ Halı Saha Maçı (${match.matchFormat || '7v7'})
DESCRIPTION:Halı Saha Maçı\\nSaha: ${match.venueName} (${match.pitchNo})\\nKişi Başı Ücret: ${match.costPerPlayer} ₺\\nMaç saatinden 15 dakika önce sahada olun.
LOCATION:${match.venueName} - ${match.pitchNo}
STATUS:CONFIRMED
BEGIN:VALARM
TRIGGER:-PT2H
DESCRIPTION:Halı saha maçına 2 saat kaldı! Çantaları kontrol edin.
ACTION:DISPLAY
END:VALARM
BEGIN:VALARM
TRIGGER:-P1D
DESCRIPTION:Yarın halı saha maçı var!
ACTION:DISPLAY
END:VALARM
END:VEVENT
END:VCALENDAR`;
}

/**
 * Download .ics file directly to device
 */
export function downloadIcsFile(match: Match): void {
  const icsData = generateIcsContent(match);
  const blob = new Blob([icsData], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `halisaha-mac-${match.date}.ics`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
