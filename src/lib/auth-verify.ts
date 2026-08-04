// src/lib/auth-verify.ts
// Server-side verification of Firebase ID tokens WITHOUT a service account.
//
// Uses the Google Identity Toolkit REST endpoint `accounts:lookup`. Google
// validates the token's signature and expiry on their side and returns the user
// record only for valid tokens, so a forged/expired token is always rejected.
// No secret service-account file is required, which keeps deployment to
// Vercel / shared hosting trivial.

const API_KEY = process.env.FIREBASE_API_KEY || process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

export interface VerifiedUser {
  uid: string;
  email?: string;
  emailVerified?: boolean;
  displayName?: string;
}

const LOOKUP_URL = () =>
  `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(API_KEY ?? '')}`;

export async function verifyIdToken(token: string | null | undefined): Promise<VerifiedUser | null> {
  if (!token) return null;
  if (!API_KEY) {
    console.warn('[auth-verify] FIREBASE_API_KEY is not set — rejecting token.');
    return null;
  }

  try {
    const res = await fetch(LOOKUP_URL(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken: token }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) return null;

    const data: any = await res.json();
    const user = data?.users?.[0];
    if (!user?.localId) return null;

    return {
      uid: user.localId,
      email: user.email,
      emailVerified: user.emailVerified === true,
      displayName: user.displayName || user.email || undefined,
    };
  } catch (err) {
    console.warn('[auth-verify] Token lookup failed:', (err as Error)?.message ?? err);
    return null;
  }
}

/** Extract the Bearer token from an Authorization header. */
export function bearerToken(authorization: string | null | undefined): string | null {
  if (!authorization) return null;
  const match = /^Bearer\s+(.+)$/i.exec(authorization.trim());
  return match ? match[1].trim() : null;
}
