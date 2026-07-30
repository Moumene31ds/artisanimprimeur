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

    const googleApiKey = process.env.GOOGLE_API_KEY;

    const styleSuffix =
      style === 'pro'
        ? 'professional premium vector logo graphic style'
        : style === 'creative'
        ? 'artistic creative graphic design concept'
        : 'minimalist clean layout design';

    const finalPrompt = `${prompt.trim()}, ${styleSuffix}, isolated on solid background, printable high resolution, design prototype`;

    let base64Image: string | null = null;
    let fallback = false;

    // 1. Try Google Imagen 3 API
    if (googleApiKey) {
      try {
        const imagenUrl = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${googleApiKey}`;
        const response = await fetch(imagenUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            instances: [{ prompt: finalPrompt }],
            parameters: {
              sampleCount: 1,
              aspectRatio: '4:3',
              outputMimeType: 'image/jpeg',
              personGeneration: 'dont_allow',
            },
          }),
        });

        if (response.ok) {
          const result = await response.json();
          const encoded = result?.predictions?.[0]?.bytesBase64Encoded;
          if (encoded) {
            base64Image = `data:image/jpeg;base64,${encoded}`;
          } else {
            console.warn('Imagen API returned no image data, falling back to Pollinations.');
          }
        } else {
          const errText = await response.text();
          console.warn(`Imagen API error (${response.status}), falling back:`, errText);
        }
      } catch (err) {
        console.warn('Imagen API fetch error, falling back to Pollinations:', err);
      }
    } else {
      console.warn('GOOGLE_API_KEY not set — skipping Imagen, using Pollinations fallback.');
    }

    // 2. Fallback to Pollinations.ai if Imagen failed
    let uploadTarget: string;
    if (base64Image) {
      uploadTarget = base64Image;
    } else {
      fallback = true;
      const seed = Math.floor(Math.random() * 100000);
      uploadTarget = `https://image.pollinations.ai/prompt/${encodeURIComponent(finalPrompt)}?width=800&height=600&nologo=true&seed=${seed}`;
    }

    // 3. Upload result to Cloudinary for a permanent, fast-loading URL
    const uploadResponse = await cloudinary.uploader.upload(uploadTarget, {
      folder: 'lartisan-ai-studio',
      resource_type: 'image',
      access_mode: 'public',
    });

    return NextResponse.json({
      success: true,
      imageUrl: uploadResponse.secure_url,
      fallback,
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
