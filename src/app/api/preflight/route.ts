import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { imageUrl, printSize = 'A4', width, height } = await req.json();

    if (!imageUrl) {
      return NextResponse.json({ error: 'Image URL is required' }, { status: 400 });
    }

    // Determine actual or fallback dimensions
    const actualWidth = width ? Number(width) : 1200;
    const actualHeight = height ? Number(height) : 800;

    // A4 dimensions in inches: 8.27 x 11.69
    // A3 dimensions in inches: 11.69 x 16.54
    // Standard photo dimensions in inches: 6 x 4
    let targetWidthInches = 8.27;
    let targetHeightInches = 11.69;

    if (printSize === 'A3') {
      targetWidthInches = 11.69;
      targetHeightInches = 16.54;
    } else if (printSize === 'A5') {
      targetWidthInches = 5.83;
      targetHeightInches = 8.27;
    } else if (printSize === 'Mug' || printSize === 'Cadeau') {
      targetWidthInches = 6.0;
      targetHeightInches = 4.0;
    }

    // DPI is calculated based on the smaller dimension to be safe
    const dpiX = actualWidth / targetWidthInches;
    const dpiY = actualHeight / targetHeightInches;
    const dpi = Math.round(Math.min(dpiX, dpiY));

    let isPrintReady = true;
    let warnings: string[] = [];

    if (dpi >= 300) {
      isPrintReady = true;
    } else if (dpi >= 150) {
      isPrintReady = true;
      warnings.push(
        `Résolution moyenne (${dpi} DPI). L'impression sera convenable mais un suréchantillonnage (Upscale) est conseillé pour une netteté maximale.`
      );
    } else {
      isPrintReady = false;
      warnings.push(
        `Résolution trop basse (${dpi} DPI). L'impression risque d'être pixélisée ou floue. Veuillez utiliser une image de meilleure qualité ou cliquer sur le bouton AI Upscale.`
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        width: actualWidth,
        height: actualHeight,
        estimatedDPI: dpi,
        isPrintReady,
        warnings,
        upscaleRecommended: dpi < 300
      }
    });

  } catch (error: any) {
    console.error('Preflight error:', error);
    return NextResponse.json({ error: 'Internal server error during preflight.' }, { status: 500 });
  }
}
