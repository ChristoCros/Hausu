import { NextResponse } from 'next/server';
import si from 'systeminformation';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const [
      cpu,
      cpuTemp,
      mem,
      fsSize,
      osInfo,
      networkStats,
      dockerContainers,
    ] = await Promise.all([
      si.cpu(),
      si.cpuTemperature(),
      si.mem(),
      si.fsSize(),
      si.osInfo(),
      si.networkStats(),
      si.dockerContainers(true).catch(() => []), // fallback to empty if docker not available
    ]);

    // Fetch stats for running containers
    const dockerContainersWithStats = await Promise.all(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      dockerContainers.map(async (container: any) => {
        if (container.state === 'running' || container.state === 'up') {
          try {
            const stats = await si.dockerContainerStats(container.id);
            return { ...container, stats: Array.isArray(stats) ? stats[0] : stats };
          } catch (e) {
            console.error(`Failed to fetch stats for container ${container.id}`, e);
            return container;
          }
        }
        return container;
      })
    );

    // Fallback temperature reading for DietPi/Alpine
    let finalCpuTemp = cpuTemp;
    if (!finalCpuTemp || finalCpuTemp.main === null || finalCpuTemp.main === 0 || finalCpuTemp.main === -1) {
      try {
        const fs = require('fs');
        
        // Let's check common hwmon paths directly without execSync
        let tempVal = null;
        const hwmonPath = '/sys/class/hwmon';
        if (fs.existsSync(hwmonPath)) {
          const hwmons = fs.readdirSync(hwmonPath);
          for (const hwmon of hwmons) {
            const temp1Path = `${hwmonPath}/${hwmon}/temp1_input`;
            if (fs.existsSync(temp1Path)) {
              tempVal = parseInt(fs.readFileSync(temp1Path, 'utf8').trim(), 10);
              break;
            }
          }
        }
        
        if (tempVal !== null) {
          finalCpuTemp = { main: tempVal / 1000, cores: [], max: tempVal / 1000, socket: [], chipset: null };
        }
      } catch (e) {
        console.error("Temperature fallback failed:", e);
      }
    }

    return NextResponse.json({
      cpu,
      cpuTemp: finalCpuTemp,
      mem,
      fsSize,
      osInfo,
      networkStats,
      dockerContainers: dockerContainersWithStats,
    });
  } catch (error) {
    console.error('Failed to fetch system information', error);
    return NextResponse.json(
      { error: 'Failed to fetch system information' },
      { status: 500 }
    );
  }
}
