// Private deployments: with ACCESS_PASSWORD set, every request (pages, API, assets)
// needs HTTP Basic auth with that password (any username). Unset, the site is open,
// which is right for the demo and wrong for a live key: see README "Live scanner".
import { NextResponse, type NextRequest } from "next/server";
import { allowed } from "./lib/access.ts";

export function proxy(req: NextRequest) {
  if (allowed(req.headers.get("authorization"), process.env.ACCESS_PASSWORD)) return NextResponse.next();
  return new NextResponse("Sign in with the site password to use this Linecraft scanner.", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Linecraft", charset="UTF-8"', "Cache-Control": "no-store" },
  });
}
