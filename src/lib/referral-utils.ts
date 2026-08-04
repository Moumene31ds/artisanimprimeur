// src/lib/referral-utils.ts

/**
 * Generates a unique 6-character alphanumeric referral code (e.g. ART123)
 *
 * @param checkUnique async predicate that returns true when the code is already taken
 */
export async function generateUniqueReferralCode(
  checkUnique: (code: string) => Promise<boolean>
): Promise<string> {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let isUnique = false;
  let code = "";

  while (!isUnique) {
    // Start with a standard prefix "ART" for L'Artisan Imprimeur
    code = "ART";
    for (let i = 0; i < 3; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    // Verify uniqueness
    const existing = await checkUnique(code);

    if (!existing) {
      isUnique = true;
    }
  }

  return code;
}
