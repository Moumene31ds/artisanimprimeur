import { NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';
import { generateImage, providerLabel } from '@/lib/image-gen';

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

export const maxDuration = 60;

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
    const { prompt, style, seed, width, height } = await req.json();

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

    // Clamp dimensions to safe print/generation bounds.
    const genWidth = Math.min(Math.max(Number(width) || 1024, 256), 2048);
    const genHeight = Math.min(Math.max(Number(height) || 1024, 256), 2048);

    // Generate via the FLUX.1 / Pollinations provider chain (auto fallback).
    const generated = await generateImage({
      prompt: finalPrompt,
      width: genWidth,
      height: genHeight,
      seed: typeof seed === 'number' ? seed : undefined,
    });

    // 3. Upload result to Cloudinary for a permanent, fast-loading URL
    const uploadResponse = await cloudinary.uploader.upload(generated.imageUrl, {
      folder: 'lartisan-ai-studio',
      resource_type: 'image',
      access_mode: 'public',
    });

    return NextResponse.json({
      success: true,
      imageUrl: uploadResponse.secure_url,
      fallback: generated.fallback,
      provider: generated.provider,
      providerLabel: providerLabel(generated.provider),
      publicId: uploadResponse.public_id,
      width: genWidth,
      height: genHeight,
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
