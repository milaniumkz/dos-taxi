export function normalizeAuthPhone(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  if (!/^\+?\d{10,15}$/.test(trimmed)) return trimmed;
  const digits = trimmed.replace(/^\+/, '');
  if (digits.length === 10) return `+7${digits}`;
  if (digits.length === 11 && digits.startsWith('8'))
    return `+7${digits.slice(1)}`;
  return `+${digits}`;
}
