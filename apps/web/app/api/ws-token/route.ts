import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { SignJWT } from "jose";

// The AI service verifies with the SAME WS_TOKEN_SECRET - it must be set in
// both apps/web/.env.local and services/ai-service/.env. No fallback to
// AUTH_SECRET here: signing with a different key makes the AI service reject
// every token as "Invalid or expired". If it's unset, we return 503 and the
// client connects without a token (AI service dev mode allows that).
const wsTokenSecret = process.env.WS_TOKEN_SECRET;
const secret = wsTokenSecret ? new TextEncoder().encode(wsTokenSecret) : null;

/**
 * POST /api/ws-token
 *
 * Returns a short-lived (60 s) HMAC-signed JWT that the browser passes as
 * ?token= on WebSocket connections to the AI service.
 *
 * The AI service validates the signature with the same WS_TOKEN_SECRET,
 * checks expiry, and extracts the user ID. This replaces the missing
 * custom-header support in the WebSocket upgrade handshake.
 */
export async function POST() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!secret) {
    return NextResponse.json({ error: "WS_TOKEN_SECRET not configured" }, { status: 503 });
  }

  const token = await new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuedAt()
    .setExpirationTime("60s")
    .sign(secret);

  return NextResponse.json({ token });
}
