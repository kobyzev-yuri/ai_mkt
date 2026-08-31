export function uid(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}-${Date.now().toString(36)}`;
}

export function isoOffset(base: Date, minutes: number): string {
  return new Date(base.getTime() + minutes * 60_000).toISOString();
}
