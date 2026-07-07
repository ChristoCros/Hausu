import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { writeApi, Point } from '../lib/influxdb';

/* ------------------- Shelly Polling ------------------- */
const fetchShellyData = async () => {
  try {
    const shellyIp = process.env.NEXT_PUBLIC_SHELLY_IP;

    // Security: Validate IP format to prevent SSRF
    const ipv4Regex = /^((25[0-5]|(2[0-4]|1\d|[1-9]|)\d)\.?\b){4}$/;
    if (!shellyIp || !ipv4Regex.test(shellyIp)) {
      throw new Error("Invalid or missing Shelly IP address format");
    }

    const fetchWithTimeout = async (url: string, timeoutMs: number) => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
      try {
        return await fetch(url, { signal: controller.signal });
      } finally {
        clearTimeout(timeoutId);
      }
    };

    let res = null;
    let lastError = null;
    const maxAttempts = 2;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        res = await fetchWithTimeout(`http://${shellyIp}/rpc/Shelly.GetStatus`, 5000);
        if (res.ok) break;
        lastError = new Error(`HTTP error! status: ${res.status}`);
      } catch (err) {
        lastError = err;
      }
      
      if (attempt < maxAttempts) {
        console.warn(`[${new Date().toISOString()}] Shelly poll attempt ${attempt} failed. Retrying in 2s...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    if (!res || !res.ok) {
      throw lastError || new Error("Failed to fetch Shelly data after retries");
    }
    const data = await res.json();

    const phaseA = data['em1:0'];
    const phaseB = data['em1:1'];
    const phaseC = data['em1:2'];

    if (phaseA && phaseB && phaseC) {
      const point = new Point('shelly_power')
        .floatField('voltage_a', phaseA.voltage)
        .floatField('current_a', phaseA.current)
        .floatField('power_a', phaseA.act_power)
        .floatField('voltage_b', phaseB.voltage)
        .floatField('current_b', phaseB.current)
        .floatField('power_b', phaseB.act_power)
        .floatField('voltage_c', phaseC.voltage)
        .floatField('current_c', phaseC.current)
        .floatField('power_c', phaseC.act_power);
      
      writeApi.writePoint(point);
      await writeApi.flush();
      
      console.log(`[${new Date().toISOString()}] Shelly data saved to InfluxDB.`);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[${new Date().toISOString()}] Error fetching Shelly data:`, message);
  }
};

setInterval(fetchShellyData, 60000);
fetchShellyData(); // initial run
console.log("Shelly poller started (1 min interval)...");

// Graceful shutdown
const gracefulShutdown = async () => {
  console.log("\n[Worker] Shutting down, flushing InfluxDB write API...");
  await writeApi.close();
  process.exit(0);
};

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);
