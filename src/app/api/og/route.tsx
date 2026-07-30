import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    
    // سحب العناوين من الرابط مع وضع قيم افتراضية
    const title = searchParams.get('title') || "L'Artisan Imprimeur";
    const subtitle = searchParams.get('subtitle') || 'الطباعة الاحترافية في الجزائر';

    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#0f172a',
            backgroundImage: 'radial-gradient(circle at 25px 25px, #1e293b 2%, transparent 0%), radial-gradient(circle at 75px 75px, #1e293b 2%, transparent 0%)',
            backgroundSize: '100px 100px',
            color: 'white',
            textAlign: 'center',
            padding: '40px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '40px',
            }}
          >
            <span style={{ fontSize: '45px', fontWeight: 'bold', color: '#3b82f6' }}>L'Artisan Imprimeur</span>
          </div>
          <h1 style={{ fontSize: '75px', fontWeight: '900', margin: '0 0 20px 0', direction: 'rtl' }}>
            {title}
          </h1>
          <p style={{ fontSize: '32px', color: '#94a3b8', margin: 0, direction: 'rtl' }}>
            {subtitle}
          </p>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  } catch (e: any) {
    return new Response(`Failed to generate image`, { status: 500 });
  }
}
