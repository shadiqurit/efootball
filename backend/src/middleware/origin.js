const localHosts = new Set(['localhost', '127.0.0.1']);

export function isAllowedOrigin(origin, configuredOrigin, environment) {
  if (!origin || !configuredOrigin) return false;
  if (origin === configuredOrigin) return true;
  if (environment !== 'development') return false;
  try {
    const actual = new URL(origin);
    const configured = new URL(configuredOrigin);
    return (
      actual.origin === origin &&
      configured.origin === configuredOrigin &&
      localHosts.has(actual.hostname) &&
      localHosts.has(configured.hostname) &&
      actual.protocol === configured.protocol &&
      actual.port === configured.port
    );
  } catch {
    return false;
  }
}
