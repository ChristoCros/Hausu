import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const revalidate = 0; // Disable cache

interface NetatmoStation {
  _id: string;
  place?: {
    altitude?: number;
    city?: string;
    street?: string;
  };
  measures?: Record<string, {
    res?: Record<string, number[]>;
    type?: string[];
    rain_60min?: number;
    rain_24h?: number;
  }>;
}

async function fetchNetatmoFromApi(
  clientId: string,
  clientSecret: string,
  refreshToken: string,
  lat: number,
  lon: number
) {
  // 1. Refresh access token
  const tokenRes = await fetch('https://api.netatmo.com/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken
    })
  });
  if (!tokenRes.ok) throw new Error("Failed to refresh Netatmo token");
  const tokenData = await tokenRes.json();
  const accessToken = tokenData.access_token;

  // 2. Fetch public data for a bounding box centered around user coordinates (GET request)
  // We use a 0.08 degree bounding box (~8-9 km radius) to safely cover target station 70:ee:50:b0:91:7c
  const lat_ne = (lat + 0.08).toFixed(4);
  const lat_sw = (lat - 0.08).toFixed(4);
  const lon_ne = (lon + 0.08).toFixed(4);
  const lon_sw = (lon - 0.08).toFixed(4);

  const params = new URLSearchParams({
    lat_ne,
    lon_ne,
    lat_sw,
    lon_sw
  });
  const publicDataRes = await fetch(`https://api.netatmo.com/api/getpublicdata?${params.toString()}`, {
    headers: { 
      Authorization: `Bearer ${accessToken}`
    },
    method: 'GET',
    cache: 'no-store'
  });
  if (!publicDataRes.ok) throw new Error("Failed to fetch Netatmo public data");
  const publicData = await publicDataRes.json();
  
  // Find station by ID (configured in .env)
  const targetStationId = process.env.NETATMO_STATION_ID || '70:ee:50:b0:91:7c';
  const station = publicData.body?.find((s: NetatmoStation) => s._id === targetStationId);
  if (!station) throw new Error(`Station ${targetStationId} not found in public data`);
  
  // Extract measurements
  let temp = 0;
  let humidity = 0;
  let pressure = 0;
  let rain_1h = 0;
  let rain_today = 0;

  if (station.measures) {
    for (const moduleData of Object.values(station.measures) as Array<{
      res?: Record<string, number[]>;
      type?: string[];
      rain_60min?: number;
      rain_24h?: number;
    }>) {
      if ('rain_60min' in moduleData) {
        rain_1h = moduleData.rain_60min ?? 0;
      }
      if ('rain_24h' in moduleData) {
        rain_today = moduleData.rain_24h ?? 0;
      }

      if (moduleData.res && moduleData.type) {
        const timestamps = Object.keys(moduleData.res);
        if (timestamps.length > 0) {
          const latestTimestamp = timestamps[timestamps.length - 1];
          const values = moduleData.res[latestTimestamp];
          
          const tempIdx = moduleData.type.indexOf('temperature');
          if (tempIdx !== -1 && values[tempIdx] !== undefined) {
            temp = values[tempIdx];
          }

          const humIdx = moduleData.type.indexOf('humidity');
          if (humIdx !== -1 && values[humIdx] !== undefined) {
            humidity = values[humIdx];
          }

          const pressIdx = moduleData.type.indexOf('pressure');
          if (pressIdx !== -1 && values[pressIdx] !== undefined) {
            pressure = values[pressIdx];
          }
        }
      }
    }
  }
  
  return {
    temp,
    humidity,
    pressure,
    rain_1h,
    rain_today,
    station_name: "Vallons-de-l'Erdre",
    altitude: station.place?.altitude ?? 60,
    updated_at: new Date().toISOString()
  };
}

export async function GET() {
  const lat = parseFloat(process.env.NEXT_PUBLIC_LATITUDE || '47.456');
  const lon = parseFloat(process.env.NEXT_PUBLIC_LONGITUDE || '-1.161');

  let netatmoData = null;
  const clientId = process.env.NETATMO_CLIENT_ID;
  const clientSecret = process.env.NETATMO_CLIENT_SECRET;
  const refreshToken = process.env.NETATMO_REFRESH_TOKEN;

  if (clientId && clientSecret && refreshToken) {
    try {
      netatmoData = await fetchNetatmoFromApi(clientId, clientSecret, refreshToken, lat, lon);
      // Cache the successful fetch to the backup file
      try {
        const netatmoPath = path.resolve(process.cwd(), 'src/backend/netatmo.json');
        fs.writeFileSync(netatmoPath, JSON.stringify(netatmoData, null, 2), 'utf-8');
      } catch (err) {
        console.error("Failed to save Netatmo backup JSON:", err);
      }
    } catch (e) {
      console.error("Failed to fetch Netatmo via official API, falling back to JSON:", e);
    }
  }

  if (!netatmoData) {
    try {
      const netatmoPath = path.resolve(process.cwd(), 'src/backend/netatmo.json');
      if (fs.existsSync(netatmoPath)) {
        const fileContent = fs.readFileSync(netatmoPath, 'utf-8');
        netatmoData = JSON.parse(fileContent);
      }
    } catch (e) {
      console.error("Error reading Netatmo JSON:", e);
    }
  }

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
        },
        netatmo: netatmoData
      });
    }
    
    const data = await res.json();
    return NextResponse.json({ ...data, netatmo: netatmoData });
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
      },
      netatmo: netatmoData
    });
  }
}
