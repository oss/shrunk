/** Encode raw values once; callers must not pre-encode path segments. */
export function pathSegment(value: string): string {
  if (typeof value !== 'string' || !value || value === '.' || value === '..') {
    throw new Error('Invalid API path segment');
  }
  return encodeURIComponent(value);
}

export function objectIdSegment(value: string): string {
  if (typeof value !== 'string' || !/^[a-fA-F0-9]{24}$/.test(value)) {
    throw new Error('Invalid object ID');
  }
  return pathSegment(value);
}

export function netidSegment(value: string): string {
  if (
    typeof value !== 'string' ||
    !/^(?:[a-zA-Z0-9]+|DEV_[a-zA-Z0-9_]+)$/i.test(value)
  ) {
    throw new Error('Invalid NetID');
  }
  return pathSegment(value);
}
