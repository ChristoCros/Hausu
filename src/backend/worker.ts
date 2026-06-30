import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });
const prisma = new PrismaClient();

/* ------------------- Shelly Polling ------------------- */
const fetchShellyData = async () => {
  try {
    const shellyIp = process.env.NEXT_PUBLIC_SHELLY_IP;

    // Security: Validate IP format to prevent SSRF
    const ipv4Regex = /^((25[0-5]|(2[0-4]|1\d|[1-9]|)\d)\.?\b){4}$/;
    if (!shellyIp || !ipv4Regex.test(shellyIp)) {
      throw new Error("Invalid or missing Shelly IP address format");
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);
    let res;
    try {
      res = await fetch(`http://${shellyIp}/rpc/Shelly.GetStatus`, {
        signal: controller.signal
      });
    } finally {
      clearTimeout(timeoutId);
    }
    
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const data = await res.json();

    const phaseA = data['em1:0'];
    const phaseB = data['em1:1'];
    const phaseC = data['em1:2'];

    if (phaseA && phaseB && phaseC) {
      await prisma.shellyData.create({
        data: {
          voltage_a: phaseA.voltage, current_a: phaseA.current, power_a: phaseA.act_power,
          voltage_b: phaseB.voltage, current_b: phaseB.current, power_b: phaseB.act_power,
          voltage_c: phaseC.voltage, current_c: phaseC.current, power_c: phaseC.act_power,
        }
      });
      console.log(`[${new Date().toISOString()}] Shelly data saved.`);
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
  console.log("\n[Worker] Shutting down, disconnecting Prisma client...");
  await prisma.$disconnect();
  process.exit(0);
};

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);
