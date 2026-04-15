export const backendBaseUrl =
  process.env.FLASK_API_URL ||
  `http://127.0.0.1:${process.env.BACKEND_PORT || "5328"}`;

export const backendInternalToken =
  process.env.BACKEND_INTERNAL_TOKEN ||
  process.env.NEXTAUTH_SECRET ||
  "dev-internal-token";
