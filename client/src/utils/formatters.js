import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';
import relativeTime from 'dayjs/plugin/relativeTime';
dayjs.extend(duration);
dayjs.extend(relativeTime);

export const formatNumber = (n) => {
  if (n == null) return '—';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
};

export const formatDuration = (ms) => {
  if (!ms && ms !== 0) return '—';
  const d = dayjs.duration(ms);
  const h = Math.floor(d.asHours());
  const m = d.minutes();
  const s = d.seconds();
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
};

export const formatDateTime = (date) =>
  date ? dayjs(date).format('MMM D, YYYY HH:mm:ss') : '—';

export const formatDate = (date) =>
  date ? dayjs(date).format('MMM D, YYYY') : '—';

export const fromNow = (date) =>
  date ? dayjs(date).fromNow() : '—';

export const formatPercent = (n, decimals = 1) =>
  n != null ? `${Number(n).toFixed(decimals)}%` : '—';
