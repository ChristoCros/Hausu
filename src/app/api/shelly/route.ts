import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const revalidate = 0; // Disable cache

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const hourParam = searchParams.get('hour');
    
    // Determine the start of the requested hour
    let targetDate = new Date();
    if (hourParam) {
      const parsed = new Date(hourParam);
      if (!isNaN(parsed.getTime())) targetDate = parsed;
    }
    
    // Set to XX:00:00.000
    targetDate.setMinutes(0, 0, 0);
    const startDate = new Date(targetDate);
    const endDate = new Date(targetDate);
    endDate.setHours(endDate.getHours() + 1);

    const historyRaw = await prisma.shellyData.findMany({
      where: {
        timestamp: {
          gte: startDate,
          lt: endDate,
        }
      },
      orderBy: { timestamp: 'asc' }
    });

    // Generate exactly 60 slots (00 to 59)
    const history = [];
    for (let i = 0; i < 60; i++) {
      const slotTime = new Date(startDate);
      slotTime.setMinutes(i);
      
      const timeStr = slotTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
      
      // Find a DB entry that matches this exact minute
      const match = historyRaw.find(item => new Date(item.timestamp).getMinutes() === i);
      
      if (match) {
        history.push({
          time: timeStr,
          Maison: match.power_a,
          Solaire: Math.abs(match.power_b),
          ChauffeEau: match.power_c
        });
      } else {
        history.push({
          time: timeStr,
          Maison: null,
          Solaire: null,
          ChauffeEau: null
        });
      }
    }

    return NextResponse.json({
      history,
      targetHour: startDate.toISOString()
    });
  } catch (error) {
    console.error("Error fetching Shelly history:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
