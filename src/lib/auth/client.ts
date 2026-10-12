"use client";

import { createAuthClient } from "@neondatabase/auth/next";

/** Browser-side auth: session hook and sign-out. Talks to /api/auth/*. */
export const authClient = createAuthClient();
