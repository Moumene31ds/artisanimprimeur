import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // 1. Try Vercel request headers first
    const city = request.headers.get('x-vercel-ip-city');
    const region = request.headers.get('x-vercel-ip-country-region');
    const country = request.headers.get('x-vercel-ip-country');

    if (city || region) {
      return NextResponse.json({
        cityName: city ? decodeURIComponent(city) : '',
        regionName: region ? decodeURIComponent(region) : '',
        countryName: country || 'Algeria',
      });
    }

    // 2. Server-side fetch to IP API (bypassing browser CORS)
    const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || request.headers.get('x-real-ip') || '';

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const targetUrl = clientIp && clientIp !== '127.0.0.1' && clientIp !== '::1' && clientIp !== 'unknown'
      ? `https://freeipapi.com/api/json/${clientIp}`
      : `https://freeipapi.com/api/json`;

    const res = await fetch(targetUrl, {
      signal: controller.signal,
      headers: { 'Accept': 'application/json' },
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      return NextResponse.json(data);
    }

    return NextResponse.json({ regionName: 'Oran', cityName: 'Oran' });
  } catch (err) {
    return NextResponse.json({ regionName: 'Oran', cityName: 'Oran' });
  }
}
