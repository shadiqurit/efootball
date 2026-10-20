import { request } from './http.js';
export const isDemo = import.meta.env.VITE_DEMO_MODE === 'true';
export async function api(path, method = 'GET', body) {
  if (isDemo) return (await import('./demo.js')).demoRequest(path, method, body);
  return request(path, method, body, import.meta.env.VITE_API_URL);
}
