import { handlers } from "@/auth";
import { type NextRequest } from "next/server";

/**
 * Auth.js catch-all route.
 *
 * trustHost: true in auth.ts already allows any host.  This route simply
 * delegates to the Auth.js handlers without additional host gating, so
 * login works from localhost, LAN IPs (e.g. 192.168.1.5:3000), and
 * production domains alike.
 */
export async function GET(request: NextRequest) {
  return handlers.GET(request);
}

export const { POST } = handlers;
