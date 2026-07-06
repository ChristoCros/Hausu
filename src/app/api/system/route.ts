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
      si.networkStats('*'),
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

    return NextResponse.json({
      cpu,
      cpuTemp,
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
