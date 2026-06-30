import { NextResponse } from 'next/server';

export const revalidate = 0; // Disable cache

export async function GET() {
  try {
    const ip = process.env.NEXT_PUBLIC_SHELLY_IP;

    // Security: Validate IP format to prevent SSRF
    const ipv4Regex = /^((25[0-5]|(2[0-4]|1\d|[1-9]|)\d)\.?\b){4}$/;
    if (ip && !ipv4Regex.test(ip)) {
      return NextResponse.json({ error: "Invalid IP address format" }, { status: 400 });
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);
    const res = await fetch(`http://${ip}/rpc/Shelly.GetStatus`, {
      cache: 'no-store',
      signal: controller.signal
    }).catch(() => null);
    clearTimeout(timeoutId);
    if (!res || !res.ok) {
      return NextResponse.json({ error: "Shelly device is unreachable" }, { status: 503 });
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
