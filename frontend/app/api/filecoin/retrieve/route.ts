import { NextRequest, NextResponse } from "next/server";

// Allowed Filecoin retrieval domains (SSRF protection).
// Covers: filbeam CDN, filstorage CDN, *.fil.dev SPs, and direct SP piece endpoints.
const ALLOWED_HOSTS = [
  /^[a-zA-Z0-9-]+\.calibration\.filbeam\.io$/,
  /^[a-zA-Z0-9-]+\.filbeam\.io$/,
  /^calibration\.filbeam\.io$/,
  /^[a-zA-Z0-9]+\.calibration\.filstorage\.io$/,
  /^[a-zA-Z0-9]+\.filstorage\.io$/,
  /^[a-zA-Z0-9.\-]+\.fil\.dev$/,
];

// Filecoin piece CIDs always start with "bafkzcib" (CommP v1 CID prefix).
const PIECE_CID_RE = /^\/piece\/bafkzcib[a-z2-7]+$/i;

// IPNI routing API at cid.contact: /routing/v1/providers/{piece-cid}
// This is a public, read-only content-routing endpoint — safe to proxy.
const IPNI_PATH_RE = /^\/routing\/v1\/providers\/bafkzcib[a-z2-7]+$/i;

/**
 * A URL is allowed if:
 *   (a) the hostname matches a known CDN/SP domain, OR
 *   (b) it is an HTTPS URL whose path is exactly /piece/{filecoin-piece-cid}
 *       — this permits direct SP retrieval endpoints without needing to enumerate
 *       every possible provider hostname (SSRF surface is bounded by the fixed path), OR
 *   (c) it is the IPNI routing API (cid.contact) for piece CID discovery.
 */
function isAllowedUrl(raw: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return false;
  }
  if (parsed.protocol !== "https:") return false;
  if (ALLOWED_HOSTS.some((re) => re.test(parsed.hostname))) return true;
  // Allow any HTTPS host when the path is strictly /piece/<piece-cid>
  if (PIECE_CID_RE.test(parsed.pathname) && parsed.search === "") return true;
  // Allow IPNI provider-discovery queries at cid.contact
  if (parsed.hostname === "cid.contact" && IPNI_PATH_RE.test(parsed.pathname) && parsed.search === "") return true;
  return false;
}

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  if (!url) {
    return NextResponse.json({ error: "Missing url parameter" }, { status: 400 });
  }

  if (!isAllowedUrl(url)) {
    return NextResponse.json({ error: "URL not allowed" }, { status: 403 });
  }

  try {
    const upstream = await fetch(url, {
      headers: { Accept: "application/octet-stream, */*" },
    });

    if (!upstream.ok) {
      return NextResponse.json(
        { error: `Upstream returned ${upstream.status}` },
        { status: upstream.status },
      );
    }

    const body = await upstream.arrayBuffer();
    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": upstream.headers.get("Content-Type") ?? "application/octet-stream",
        "Cache-Control": "public, max-age=86400, immutable",
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Upstream fetch failed" },
      { status: 502 },
    );
  }
}
