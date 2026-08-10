// src/lib/file-validate.ts
// فحص حقيقي لمحتوى الملف (Magic Bytes) — يعمل فقط في بيئة Node (يستعمل Buffer).
// يمنع رفع ملفات ضارة متنكرة بصيغة صورة (SVG خبيث، ملفات سكربت...).

export type DetectedFileType =
  | 'image/png'
  | 'image/jpeg'
  | 'image/webp'
  | 'image/gif'
  | 'application/pdf'
  | 'application/postscript'
  | 'image/vnd.adobe.photoshop'
  | 'unknown';

export const ALLOWED_UPLOAD_TYPES: DetectedFileType[] = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'application/pdf',
  'application/postscript',
  'image/vnd.adobe.photoshop',
];

/** كشف نوع الملف الحقيقي عبر البصمة السحرية في أول بايتات. */
export function detectFileType(buffer: Buffer): DetectedFileType {
  if (!buffer || buffer.length < 8) return 'unknown';
  const b = buffer;

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 &&
    b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a
  ) {
    return 'image/png';
  }

  // JPEG: FF D8 FF
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg';

  // WebP: "RIFF" + "WEBP"
  if (
    b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
    b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50
  ) {
    return 'image/webp';
  }

  // GIF: "GIF8"
  if (b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x38) {
    return 'image/gif';
  }

  // PDF: "%PDF"
  if (b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46) {
    return 'application/pdf';
  }

  // PostScript / EPS / AI: "%!PS"
  if (b[0] === 0x25 && b[1] === 0x21 && b[2] === 0x50 && b[3] === 0x53) {
    return 'application/postscript';
  }

  // PSD: "8BPS"
  if (b[0] === 0x38 && b[1] === 0x42 && b[2] === 0x50 && b[3] === 0x53) {
    return 'image/vnd.adobe.photoshop';
  }

  return 'unknown';
}

/** تحويل سلسلة base64 (قد تأتي مع بادئة data:...) إلى Buffer. */
export function base64ToBuffer(input: string): Buffer | null {
  if (typeof input !== 'string' || input.length === 0) return null;
  let base64 = input;
  const comma = input.indexOf(',');
  if (comma >= 0) {
    // بادئة data:image/png;base64,
    const header = input.slice(0, comma);
    if (/^data:/.test(header)) {
      base64 = input.slice(comma + 1);
    } else {
      return null;
    }
  }
  // تجاهل whitespace
  base64 = base64.replace(/\s+/g, '');
  // قبول base64 بدون padding (Data URLs تأتي أحياناً بدونها).
  if (base64.length % 4 !== 0) {
    base64 = base64.padEnd(base64.length + (4 - (base64.length % 4)), '=');
  }
  try {
    return Buffer.from(base64, 'base64');
  } catch {
    return null;
  }
}

/** هل الملف المراد رفعه صالح (نوعه معروف ومسموح)؟ */
export function isValidUploadType(buffer: Buffer): { valid: boolean; type: DetectedFileType } {
  const type = detectFileType(buffer);
  return { valid: ALLOWED_UPLOAD_TYPES.includes(type), type };
}
