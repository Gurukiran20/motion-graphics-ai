/**
 * Safely parse a fetch response as JSON.
 * Handles cases where the server returns HTML error pages instead of JSON.
 */
export async function safeParseJSON<T = unknown>(response: Response): Promise<T> {
  const contentType = response.headers.get('content-type') || '';
  const text = await response.text();
  
  if (contentType.includes('application/json') || text.trim().startsWith('{') || text.trim().startsWith('[')) {
    try {
      return JSON.parse(text);
    } catch {
      throw new Error(`Invalid JSON response from server: ${text.substring(0, 200)}`);
    }
  }
  
  // Server returned HTML or other non-JSON content
  throw new Error(
    `Server returned an unexpected response (HTML instead of JSON). This usually means a server error occurred. Please try again.`
  );
}

/**
 * Safe fetch wrapper that handles non-JSON responses properly
 */
export async function safeFetch(url: string, options?: RequestInit): Promise<{ data: unknown; ok: boolean; status: number }> {
  const response = await fetch(url, options);
  const data = await safeParseJSON(response);
  return { data, ok: response.ok, status: response.status };
}
