import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';
import { base64ToBuffer, isValidUploadType } from '@/lib/file-validate';
import { getClientIp } from '@/lib/security';
import { uploadLimiter } from '@/lib/rate-limit';
import { logSecurityEvent } from '@/lib/audit';

// ✅ Fixed: Use CLOUDINARY_CLOUD_NAME (server-side) — works in API routes
const cloudName = process.env.CLOUDINARY_CLOUD_NAME || process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

// Early config validation
if (!cloudName || !apiKey || !apiSecret) {
  console.error('❌ Cloudinary config missing:', {
    cloudName: !!cloudName,
    apiKey: !!apiKey,
    apiSecret: !!apiSecret,
  });
}

cloudinary.config({
  cloud_name: cloudName,
  api_key: apiKey,
  api_secret: apiSecret,
  secure: true,
});

export async function POST(request: NextRequest) {
  // Guard: Validate Cloudinary credentials at request time
  if (!cloudName || !apiKey || !apiSecret) {
    return NextResponse.json(
      {
        error: 'Cloudinary is not configured. Please check your .env.local file.',
        missing: {
          cloud_name: !cloudName,
          api_key: !apiKey,
          api_secret: !apiSecret,
        },
      },
      { status: 503 }
    );
  }

  // Security: rate limit per IP (يحفظ حصة Cloudinary من الاستغلال).
  const rl = uploadLimiter.allow(`ip:${getClientIp(request)}`);
  if (!rl.allowed) {
    const retryAfter = Math.ceil(rl.retryAfterMs / 1000);
    return NextResponse.json(
      { error: 'Trop d\'uploads. Réessayez plus tard.', retryAfterSeconds: retryAfter },
      { status: 429, headers: { 'Retry-After': String(retryAfter) } }
    );
  }

  try {
    const body = await request.json();
    const { file } = body;

    if (!file || typeof file !== 'string') {
      return NextResponse.json(
        { error: 'No file data received. Please provide a base64 string or Data URL.' },
        { status: 400 }
      );
    }

    // Security: Limit payload size to ~15MB
    const MAX_BASE64_LENGTH = 20 * 1024 * 1024;
    if (file.length > MAX_BASE64_LENGTH) {
      return NextResponse.json(
        { error: 'File exceeds the maximum allowed size (15MB).' },
        { status: 413 }
      );
    }

    // Security: فحص المحتوى الحقيقي (Magic Bytes) وليس التصريح فقط —
    // يمنع رفع SVG خبيث أو ملفات متنكرة بصيغة صورة.
    const buffer = base64ToBuffer(file);
    if (!buffer || buffer.length === 0) {
      return NextResponse.json(
        { error: 'Invalid file encoding. Please provide a valid base64 file.' },
        { status: 400 }
      );
    }

    const { valid, type } = isValidUploadType(buffer);
    if (!valid) {
      // سجل تدقيق أمني: محاولة رفع نوع ملف غير مسموح (مؤشر أتمتة أو هجوم).
      logSecurityEvent({
        type: 'upload:invalid-type',
        ip: getClientIp(request),
        details: `Rejected upload with detected type: ${type}`,
        metadata: { bytes: buffer.length },
      });
      return NextResponse.json(
        {
          error:
            'File type not allowed. Please upload PNG, JPEG, WebP, GIF, PDF, EPS/AI or PSD files only.',
          detected: type,
        },
        { status: 415 }
      );
    }

    // رفض صريح لملفات SVG (ناقل XSS) حتى لو ادعت صيغة أخرى.
    const mimeDeclared = file.startsWith('data:')
      ? file.slice(0, file.indexOf(';')).replace('data:', '').toLowerCase()
      : '';
    if (mimeDeclared === 'image/svg+xml' || /\.svg$/i.test(file.split(',')[0] || '')) {
      return NextResponse.json(
        { error: 'SVG files are not allowed for security reasons.' },
        { status: 415 }
      );
    }

    // Upload to Cloudinary
    const uploadResponse = await cloudinary.uploader.upload(file, {
      folder: 'lartisan-uploads',
      resource_type: 'auto',
      access_mode: 'public',
    });

    return NextResponse.json({
      success: true,
      url: uploadResponse.secure_url,
      public_id: uploadResponse.public_id,
    });

  } catch (error: any) {
    console.error('[CLOUDINARY_UPLOAD_ERROR]:', {
      message: error.message,
      http_code: error.http_code,
      name: error.name,
    });

    // Friendly error for invalid credentials
    if (error.http_code === 401) {
      return NextResponse.json(
        { error: 'Cloudinary authentication failed. Check your API key and secret.' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      {
        error: 'Upload to Cloudinary failed.',
        details: error.message || 'Unknown server error',
      },
      { status: 500 }
    );
  }
}
