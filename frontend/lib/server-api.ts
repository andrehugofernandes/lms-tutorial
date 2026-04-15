import { auth, currentUser } from "@/lib/auth";
import { backendBaseUrl, backendInternalToken } from "@/lib/backend";

type BackendRequestInit = RequestInit & {
  expectText?: boolean;
};

export async function serverApi<T = any>(
  path: string,
  init: BackendRequestInit = {}
): Promise<T> {
  const { userId } = await auth();
  const user = await currentUser();

  const headers = new Headers(init.headers);
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

  const response = await fetch(`${backendBaseUrl}${path}`, {
    ...init,
    headers,
    cache: "no-store",
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Request failed with status ${response.status}`);
  }

  if (init.expectText) {
    return (await response.text()) as T;
  }

  if (response.status === 204) {
    return null as T;
  }

  return (await response.json()) as T;
}
