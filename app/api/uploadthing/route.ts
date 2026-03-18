import { createRouteHandler } from "uploadthing/next";

import { ourFileRouter } from "./core";

const uploadThingToken =
  process.env.UPLOADTHING_TOKEN ??
  (() => {
    const apiKey = process.env.UPLOADTHING_SECRET;
    const appId = process.env.UPLOADTHING_APP_ID;

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
  })();

export const { GET, POST } = createRouteHandler({
  router: ourFileRouter,
  config: uploadThingToken ? { token: uploadThingToken } : undefined,
});
