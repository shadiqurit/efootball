import { getApiBase } from './api-config.js';
export async function request(path, method = 'GET', body, buildUrl) {
  const baseUrl = getApiBase(globalThis.TOUCHLINE_CONFIG?.apiUrl, buildUrl);
  let response;
  try {
    response = await fetch(`${baseUrl}${path}`, {
      method,
      credentials: 'include',
      headers: body ? { 'Content-Type': 'application/json' } : {},
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error('Cannot reach the server. Check your connection and try again.');
  }
  let data = null;
  if (response.status !== 204) {
    try {
      data = await response.json();
    } catch {
      throw new Error('The API returned an invalid response. Check the configured API URL.');
    }
  }
  if (!response.ok) {
    const err = new Error(data.message || 'Request failed.');
    err.status = response.status;
    throw err;
  }
  return data;
}
