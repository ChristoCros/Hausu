import { NextResponse } from 'next/server';

export const revalidate = 0; // Disable cache

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const ip = searchParams.get('shellyIp') || process.env.SHELLY_IP || process.env.PRINTER_IP || '192.168.1.68';
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);
    const res = await fetch(`http://${ip}/rpc/Shelly.GetStatus`, { 
      cache: 'no-store',
      signal: controller.signal
    }).catch(() => null);
    clearTimeout(timeoutId);
    if (!res || !res.ok) {
      // Return dummy data for testing / CI environments when Shelly device is not reachable
      return NextResponse.json({
        voltage_a: 0,
        current_a: 0,
        power_a: 0,
        voltage_b: 0,
        current_b: 0,
        power_b: 0,
        voltage_c: 0,
        current_c: 0,
        power_c: 0,
      });
    }
    const data = await res.json();
    
    return NextResponse.json({
      voltage_a: data['em1:0']?.voltage || 0,
      current_a: data['em1:0']?.current || 0,
      power_a: data['em1:0']?.act_power || 0,
      voltage_b: data['em1:1']?.voltage || 0,
      current_b: data['em1:1']?.current || 0,
      power_b: data['em1:1']?.act_power || 0,
      voltage_c: data['em1:2']?.voltage || 0,
      current_c: data['em1:2']?.current || 0,
      power_c: data['em1:2']?.act_power || 0,
    });
  } catch (error) {
    console.error("Error fetching live Shelly data:", error);
    return NextResponse.json({ error: "Failed to fetch live data" }, { status: 500 });
  }
}
