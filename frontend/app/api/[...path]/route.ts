import { NextRequest, NextResponse } from "next/server";

import { auth, currentUser } from "@/lib/auth";
import { backendBaseUrl, backendInternalToken } from "@/lib/backend";

async function proxyRequest(
  request: NextRequest,
  props: { params: Promise<{ path: string[] }> }
) {
  const params = await props.params;
  const { userId } = await auth();
  const user = await currentUser();

  const proxiedUrl = new URL(
    `/api/${params.path.join("/")}${request.nextUrl.search}`,
    backendBaseUrl
  );

  const headers = new Headers();
  headers.set("X-Internal-Token", backendInternalToken);

  const contentType = request.headers.get("content-type");
  if (contentType) {
    headers.set("Content-Type", contentType);
  }

  if (userId) {
    headers.set("X-User-Id", userId);
  }
  if (user?.email) {
    headers.set("X-User-Email", user.email);
  }
  if (user?.name) {
    headers.set("X-User-Name", user.name);
  }

  const body =
    request.method === "GET" || request.method === "HEAD"
      ? undefined
      : await request.text();

  const response = await fetch(proxiedUrl, {
    method: request.method,
    headers,
    body,
    cache: "no-store",
  });

  const text = await response.text();
  const nextResponse = new NextResponse(text, {
    status: response.status,
  });

  const responseContentType = response.headers.get("content-type");
  if (responseContentType) {
    nextResponse.headers.set("content-type", responseContentType);
  }

  return nextResponse;
}

export async function GET(
  request: NextRequest,
  props: { params: Promise<{ path: string[] }> }
) {
  return proxyRequest(request, props);
}

export async function POST(
  request: NextRequest,
  props: { params: Promise<{ path: string[] }> }
) {
  return proxyRequest(request, props);
}

export async function PUT(
  request: NextRequest,
  props: { params: Promise<{ path: string[] }> }
) {
  return proxyRequest(request, props);
}

export async function PATCH(
  request: NextRequest,
  props: { params: Promise<{ path: string[] }> }
) {
  return proxyRequest(request, props);
}

export async function DELETE(
  request: NextRequest,
  props: { params: Promise<{ path: string[] }> }
) {
  return proxyRequest(request, props);
}
