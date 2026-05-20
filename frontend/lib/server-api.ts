import { auth, currentUser } from "@/lib/auth";
import { backendBaseUrl, backendInternalToken } from "@/lib/backend";

type BackendRequestInit = RequestInit & {
  expectText?: boolean;
  retries?: number;
  retryDelayMs?: number;
  timeoutMs?: number;
};

const wait = (ms: number) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

export async function serverApi<T = any>(
  path: string,
  init: BackendRequestInit = {}
): Promise<T> {
  const {
    expectText,
    retries = 2,
    retryDelayMs = 1000,
    timeoutMs = 30000,
    ...requestInit
  } = init;
  const { userId } = await auth();
  const user = await currentUser();

  const headers = new Headers(requestInit.headers);
  headers.set("X-Internal-Token", backendInternalToken);

  if (userId) {
    headers.set("X-User-Id", userId);
  }
  if (user?.email) {
    headers.set("X-User-Email", user.email);
  }
  if (user?.name) {
    headers.set("X-User-Name", user.name);
  }

  let response: Response | undefined;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      response = await fetch(`${backendBaseUrl}${path}`, {
        ...requestInit,
        headers,
        cache: "no-store",
        signal: requestInit.signal || controller.signal,
      });
      break;
    } catch (error) {
      if (attempt < retries) {
        clearTimeout(timeout);
        await wait(retryDelayMs * (attempt + 1));
        continue;
      }

      const cause =
        error instanceof Error && "cause" in error ? error.cause : undefined;
      const detail =
        cause instanceof Error
          ? cause.message
          : error instanceof Error
            ? error.message
            : String(error);
      throw new Error(
        `Backend unavailable at ${backendBaseUrl}${path}: ${detail}`
      );
    } finally {
      clearTimeout(timeout);
    }
  }

  if (!response) {
    throw new Error(`Backend unavailable at ${backendBaseUrl}${path}`);
  }

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Request failed with status ${response.status}`);
  }

  if (expectText) {
    return (await response.text()) as T;
  }

  if (response.status === 204) {
    return null as T;
  }

  return (await response.json()) as T;
}
