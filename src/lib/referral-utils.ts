// src/lib/referral-utils.ts

/**
 * Generates a unique 6-character alphanumeric referral code (e.g. ART123)
 */
export async function generateUniqueReferralCode(prisma: any): Promise<string> {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let isUnique = false;
  let code = "";

  while (!isUnique) {
    // Start with a standard prefix "ART" for L'Artisan Imprimeur
    code = "ART";
    for (let i = 0; i < 3; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    // Verify uniqueness in PostgreSQL
    const existing = await prisma.user.findUnique({
      where: { referralCode: code },
    });

    if (!existing) {
      isUnique = true;
    }
  }

  return code;
}
