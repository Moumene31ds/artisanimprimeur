import { NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';

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

export async function POST(request: Request) {
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

  try {
    const body = await request.json();
    const { file } = body;

    if (!file) {
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

    // Security: Validate MIME type for data URIs
    if (file.startsWith('data:')) {
      const mimeMatch = file.match(/^data:([^;]+);base64,/);
      if (mimeMatch) {
        const mimeType = mimeMatch[1];
        const allowedMimeTypes = [
          'image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif',
          'application/pdf', 'application/postscript', 'image/vnd.adobe.photoshop',
        ];
        if (!allowedMimeTypes.includes(mimeType)) {
          return NextResponse.json(
            { error: 'File type not allowed. Please upload PDFs or high-resolution images.' },
            { status: 415 }
          );
        }
      }
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
