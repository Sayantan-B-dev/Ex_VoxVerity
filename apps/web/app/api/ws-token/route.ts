import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { SignJWT } from "jose";

const secret = new TextEncoder().encode(
  process.env.WS_TOKEN_SECRET || process.env.AUTH_SECRET || "dev-ws-token-secret"
);

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

  const token = await new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuedAt()
    .setExpirationTime("60s")
    .sign(secret);

  return NextResponse.json({ token });
}
