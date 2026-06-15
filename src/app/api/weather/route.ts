import { NextResponse } from 'next/server';

export const revalidate = 0; // Disable cache

export async function GET() {
  try {
    const lat = parseFloat(process.env.NEXT_PUBLIC_LATITUDE || '48.8566');
    const lon = parseFloat(process.env.NEXT_PUBLIC_LONGITUDE || '2.3522');
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=weathercode,temperature_2m_max,temperature_2m_min&timezone=Europe/Paris`;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);
    const res = await fetch(url, { 
      cache: 'no-store',
      signal: controller.signal
    }).catch(() => null);
    clearTimeout(timeoutId);
    if (!res || !res.ok) {
      // Fallback dummy weather (June temperatures)
      return NextResponse.json({
        daily: {
          time: [
            new Date().toISOString().split('T')[0],
            new Date(Date.now() + 86400000).toISOString().split('T')[0],
            new Date(Date.now() + 172800000).toISOString().split('T')[0],
          ],
          weathercode: [0, 1, 3], // Ensoleillé, Nuageux, Très nuageux
          temperature_2m_max: [23.5, 25.0, 24.2],
          temperature_2m_min: [13.0, 14.5, 13.8],
        }
      });
    }
    
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Weather fetch error:", error);
    return NextResponse.json({
      daily: {
        time: [
          new Date().toISOString().split('T')[0],
          new Date(Date.now() + 86400000).toISOString().split('T')[0],
          new Date(Date.now() + 172800000).toISOString().split('T')[0],
        ],
        weathercode: [0, 1, 3],
        temperature_2m_max: [23.5, 25.0, 24.2],
        temperature_2m_min: [13.0, 14.5, 13.8],
      }
    });
  }
}
