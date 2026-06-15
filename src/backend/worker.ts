import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });
const prisma = new PrismaClient();

/* ------------------- Shelly Polling ------------------- */
const fetchShellyData = async () => {
  try {
    const shellyIp = process.env.SHELLY_IP || process.env.PRINTER_IP || '192.168.1.68';

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);
    const res = await fetch(`http://${shellyIp}/rpc/Shelly.GetStatus`, {
      signal: controller.signal
    });
    clearTimeout(timeoutId);
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
console.log("Shelly poller started (1 min interval)...");;
