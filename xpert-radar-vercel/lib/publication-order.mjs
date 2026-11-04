// Missing/invalid source dates stay last. Never substitute the discovery date.
export function publicationTimestamp(value) {
  if (typeof value !== 'string' || !value.trim()) return null;
  const text = value.trim();
  const local = text.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})\.?$/);
  if (local) {
    const [, day, month, year] = local;
    const stamp = Date.UTC(+year, +month - 1, +day);
    const date = new Date(stamp);
    return date.getUTCFullYear() === +year && date.getUTCMonth() === +month - 1 && date.getUTCDate() === +day ? stamp : null;
  }
  if (!/^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(text) && !/[A-Za-z]{3}.*\d{4}/.test(text)) return null;
  const stamp = Date.parse(text);
  return Number.isFinite(stamp) ? stamp : null;
}
export function byPublicationDesc(a, b) {
  const left = publicationTimestamp(a.published);
  const right = publicationTimestamp(b.published);
  if (left === null) return right === null ? 0 : 1;
  if (right === null) return -1;
  return right - left;
}
export function publicationLabel(value) {
  const stamp = publicationTimestamp(value);
  return stamp === null ? 'Datum nije dostupan' : new Intl.DateTimeFormat('sr-Latn-RS', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Europe/Belgrade' }).format(stamp);
}
