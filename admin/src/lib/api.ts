/** Error with the HTTP status and the API's `{ error }` message. */
export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
}

/**
 * Calls the Go API through the /api rewrite in next.config.ts and returns
 * the parsed JSON. Throws ApiError with the API's message on failure.
 */
export async function apiRequest<T>(path: string, token: string | null, { method = 'GET', body }: RequestOptions = {}): Promise<T> {
  const headers = new Headers();
  if (body !== undefined) headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);

  let res: Response;
  try {
    res = await fetch(path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  } catch {
    throw new ApiError(0, 'Cannot reach the server. Check your connection.');
  }

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const message = data?.error || (res.status >= 500 ? 'The API server is not responding. Is the backend running?' : `Request failed (${res.status})`);
    throw new ApiError(res.status, message);
  }
  return data as T;
}
