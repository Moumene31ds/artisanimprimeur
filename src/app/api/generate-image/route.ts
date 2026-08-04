import { NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';

// ✅ Fixed: Use CLOUDINARY_CLOUD_NAME (server-side) with fallback
const cloudName = process.env.CLOUDINARY_CLOUD_NAME || process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

cloudinary.config({
  cloud_name: cloudName,
  api_key: apiKey,
  api_secret: apiSecret,
  secure: true,
});

export const maxDuration = 40;

export async function POST(req: Request) {
  // Guard: Validate Cloudinary credentials
  if (!cloudName || !apiKey || !apiSecret) {
    return NextResponse.json(
      {
        error: 'Cloudinary is not configured correctly. Check your .env.local file.',
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
    const { prompt, style } = await req.json();

    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      return NextResponse.json({ error: 'A valid prompt is required.' }, { status: 400 });
    }

    const styleSuffix =
      style === 'pro'
        ? 'professional premium vector logo graphic style'
        : style === 'creative'
        ? 'artistic creative graphic design concept'
        : 'minimalist clean layout design';

    const finalPrompt = `${prompt.trim()}, ${styleSuffix}, isolated on solid background, printable high resolution, design prototype`;

    // Free image generation via Pollinations.ai (no API key required).
    const seed = Math.floor(Math.random() * 100000);
    const uploadTarget = `https://image.pollinations.ai/prompt/${encodeURIComponent(finalPrompt)}?width=800&height=600&nologo=true&seed=${seed}`;

    // 3. Upload result to Cloudinary for a permanent, fast-loading URL
    const uploadResponse = await cloudinary.uploader.upload(uploadTarget, {
      folder: 'lartisan-ai-studio',
      resource_type: 'image',
      access_mode: 'public',
    });

    return NextResponse.json({
      success: true,
      imageUrl: uploadResponse.secure_url,
      fallback: true,
      publicId: uploadResponse.public_id,
    });

  } catch (error: any) {
    console.error('❌ Image Generation API Error:', {
      message: error.message,
      http_code: error.http_code,
    });

    if (error.http_code === 401) {
      return NextResponse.json(
        { error: 'Cloudinary authentication failed. Check your API credentials.' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      {
        error: 'Failed to generate design.',
        details: error.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}
