export function getApiBase(runtimeUrl, buildUrl) {
  const value = String(runtimeUrl || buildUrl || '/api')
    .trim()
    .replace(/\/+$/, '');
  if (value.startsWith('/') && !value.startsWith('//') && !/[?#\\]/.test(value)) return value;
  try {
    const url = new URL(value);
    if (
      ['https:', 'http:'].includes(url.protocol) &&
      !url.username &&
      !url.password &&
      !url.search &&
      !url.hash
    )
      return url.href.replace(/\/+$/, '');
  } catch {
    /* Display one actionable configuration error. */
  }
  throw new Error(
    'Set config.js apiUrl to your backend URL, for example https://api.example.com/api.',
  );
}
