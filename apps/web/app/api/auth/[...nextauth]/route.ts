import { handlers } from "@/auth";
import { headers } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

function hostMatches(request: NextRequest): boolean {
  const host = request.headers.get("host") ?? "";
  const forwardedHost = request.headers.get("x-forwarded-host") ?? "";
  const effectiveHost = forwardedHost || host;
  return !effectiveHost || effectiveHost === APP_URL.replace(/^https?:\/\//, "");
}

export async function GET(request: NextRequest) {
  if (!hostMatches(request)) {
    return NextResponse.json({ error: "Unsupported host" }, { status: 400 });
  }

  return handlers.GET(request);
}

export const { POST } = handlers;
