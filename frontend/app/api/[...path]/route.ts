import { NextRequest, NextResponse } from "next/server";

import { auth, currentUser } from "@/lib/auth";
import { backendBaseUrl, backendInternalToken } from "@/lib/backend";

const DEFAULT_TIMEOUT_MS = 30000;
const AI_GENERATE_TIMEOUT_MS = 180000;

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

  const isAiGenerate = params.path.join("/").endsWith("/quiz/generate");
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    isAiGenerate ? AI_GENERATE_TIMEOUT_MS : DEFAULT_TIMEOUT_MS
  );

  let response: Response;
  try {
    response = await fetch(proxiedUrl, {
      method: request.method,
      headers,
      body,
      cache: "no-store",
      signal: controller.signal,
    });
  } catch (error) {
    const isAbort = error instanceof Error && error.name === "AbortError";
    const cause = error instanceof Error && "cause" in error ? error.cause : undefined;
    const detail = cause instanceof Error ? cause.message : error instanceof Error ? error.message : String(error);
    return new NextResponse(
      isAbort
        ? "O backend demorou demais para responder. Tente novamente em instantes."
        : `Nao foi possivel conectar ao backend em ${backendBaseUrl}. Detalhe: ${detail}`,
      { status: isAbort ? 504 : 503 }
    );
  } finally {
    clearTimeout(timeout);
  }

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
