export { auth as middleware } from "@/auth";

export const config = {
  matcher: [
    /*
     * Match protected routes:
     * - /dashboard, /live, /calls, /analysis, /alerts, /incidents
     * - /verification, /analytics, /blockchain, /audit, /integrations
     * - /models, /settings, /admin, /lab, /threat-intelligence
     * Exclude public/auth/API/static routes
     */
    "/((?!login|register|forgot-password|reset-password|help|status|_next|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
