/**
 * Next.js App Router API proxy
 * Forwards ALL methods (GET, POST, PUT, PATCH, DELETE) to Render backend.
 * This is needed because Next.js rewrites() only forwards GET/POST.
 */

const BACKEND = process.env.BACKEND_URL || "https://smartsalon-api-iiss.onrender.com";

async function handler(req, context) {
  const segments = context.params?.path ?? [];
  const pathStr = Array.isArray(segments) ? segments.join("/") : segments;
  const search = req.url.includes("?") ? "?" + req.url.split("?").slice(1).join("?") : "";
  const targetUrl = `${BACKEND}/api/${pathStr}${search}`;

  // Forward headers except host
  const headers = {};
  req.headers.forEach((value, key) => {
    if (key !== "host") headers[key] = value;
  });

  // Forward body for write methods
  let body = undefined;
  if (!["GET", "HEAD"].includes(req.method)) {
    body = await req.blob();
  }

  try {
    const upstream = await fetch(targetUrl, {
      method: req.method,
      headers,
      body,
      redirect: "manual",
    });

    const resHeaders = {};
    upstream.headers.forEach((value, key) => {
      if (!["content-encoding", "transfer-encoding", "connection"].includes(key)) {
        resHeaders[key] = value;
      }
    });

    const resBody = await upstream.arrayBuffer();
    return new Response(resBody, { status: upstream.status, headers: resHeaders });

  } catch (err) {
    console.error(`[proxy] ${req.method} ${targetUrl} ->`, err.message);
    return Response.json(
      { error: "Backend unavailable: " + err.message },
      { status: 503 }
    );
  }
}

export const GET     = handler;
export const POST    = handler;
export const PUT     = handler;
export const PATCH   = handler;
export const DELETE  = handler;
export const OPTIONS = handler;

export const maxDuration = 60;
