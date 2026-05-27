import { createRouteHandler } from "uploadthing/next";

import { ourFileRouter } from "./core";

const getUploadThingToken = () => {
  const token = process.env.UPLOADTHING_TOKEN?.trim();

  if (token) {
    return token;
  }

  const apiKey = process.env.UPLOADTHING_SECRET?.trim();
  const appId = process.env.UPLOADTHING_APP_ID?.trim();

  if (!apiKey || !appId) {
    return undefined;
  }

  const regions = (process.env.UPLOADTHING_REGION ?? "sea1")
    .split(",")
    .map((region) => region.trim())
    .filter(Boolean);

  return Buffer.from(
    JSON.stringify({
      apiKey,
      appId,
      regions: regions.length > 0 ? regions : ["sea1"],
    }),
    "utf8",
  ).toString("base64");
};

const uploadThingToken = getUploadThingToken();

export const { GET, POST } = createRouteHandler({
  router: ourFileRouter,
  config: uploadThingToken ? { token: uploadThingToken } : undefined,
});
