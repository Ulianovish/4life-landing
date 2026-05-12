import type { Context } from "https://edge.netlify.com";

const SUPPORTED = new Set(["BO", "CL", "CR", "MX", "BR", "CO", "EC", "PE"]);

export default async (request: Request, context: Context) => {
  const detected = context.geo?.country?.code?.toUpperCase() ?? "";
  const country = SUPPORTED.has(detected) ? detected : "CO";

  const response = await context.next();

  response.headers.append(
    "Set-Cookie",
    `nf_country=${country}; Path=/; Max-Age=86400; SameSite=Lax`,
  );

  const existingVary = response.headers.get("Vary");
  if (!existingVary?.toLowerCase().includes("cookie")) {
    response.headers.set(
      "Vary",
      existingVary ? `${existingVary}, Cookie` : "Cookie",
    );
  }

  return response;
};

export const config = { path: "/*" };
