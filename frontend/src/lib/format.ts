const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "2023-08" -> "Aug 2023"; null -> "Present". */
export function formatMonth(value: string | null): string {
  if (!value) return 'Present';
  const [year, month] = value.split('-');
  const name = month ? MONTHS[Number(month) - 1] : undefined;
  return name ? `${name} ${year}` : (year ?? value);
}

export function formatPeriod(start: string, end: string | null): string {
  return `${formatMonth(start)} – ${formatMonth(end)}`;
}

/** Inclusive duration, e.g. "2 yrs 7 mos". */
export function formatDuration(start: string, end: string | null, now = new Date()): string {
  const [sy, sm] = start.split('-').map(Number);
  const [ey, em] = end ? end.split('-').map(Number) : [now.getFullYear(), now.getMonth() + 1];
  if (!sy || !sm || !ey || !em) return '';
  const total = (ey - sy) * 12 + (em - sm) + 1;
  const years = Math.floor(total / 12);
  const months = total % 12;
  const parts = [];
  if (years) parts.push(`${years} yr${years > 1 ? 's' : ''}`);
  if (months) parts.push(`${months} mo${months > 1 ? 's' : ''}`);
  return parts.join(' ');
}

export const formatNumber = (n: number) => n.toLocaleString('en-US');
