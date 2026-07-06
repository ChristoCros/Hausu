import { NextResponse } from 'next/server';
import { queryApi } from '../../../lib/influxdb';

export const revalidate = 0; // Disable cache

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const hourParam = searchParams.get('hour');
    const mode = searchParams.get('mode') || 'hour'; // 'hour' or 'day'
    
    // Determine the target date
    let targetDate = new Date();
    if (hourParam) {
      const parsed = new Date(hourParam);
      if (!isNaN(parsed.getTime())) targetDate = parsed;
    }
    
    const startDate = new Date(targetDate);
    let endDate = new Date(targetDate);
    
    if (mode === 'day') {
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 1);
    } else {
      startDate.setMinutes(0, 0, 0);
      endDate = new Date(startDate);
      endDate.setHours(endDate.getHours() + 1);
    }

    const startISO = startDate.toISOString();
    const endISO = endDate.toISOString();

    const bucket = process.env.INFLUXDB_BUCKET || 'Hausu_bucket';

    let query = '';
    if (mode === 'day') {
      query = `
        from(bucket: "${bucket}")
          |> range(start: ${startISO}, stop: ${endISO})
          |> filter(fn: (r) => r._measurement == "shelly_power")
          |> aggregateWindow(every: 15m, fn: mean, createEmpty: false, timeSrc: "_start")
          |> pivot(rowKey:["_time"], columnKey: ["_field"], valueColumn: "_value")
      `;
    } else {
      query = `
        from(bucket: "${bucket}")
          |> range(start: ${startISO}, stop: ${endISO})
          |> filter(fn: (r) => r._measurement == "shelly_power")
          |> pivot(rowKey:["_time"], columnKey: ["_field"], valueColumn: "_value")
      `;
    }

    const historyRaw: Array<{ timestamp: Date; power_a: number; power_b: number; power_c: number }> = [];
    for await (const { values, tableMeta } of queryApi.iterateRows(query)) {
      const o = tableMeta.toObject(values);
      historyRaw.push({
        timestamp: new Date(o._time),
        power_a: o.power_a || 0,
        power_b: o.power_b || 0,
        power_c: o.power_c || 0,
      });
    }

    const history = [];
    
    if (mode === 'day') {
      // Generate 96 slots of 15 minutes (24 * 4)
      for (let i = 0; i < 96; i++) {
        const slotTime = new Date(startDate);
        slotTime.setMinutes(i * 15);
        
        const timeStr = slotTime.toLocaleTimeString('fr-FR', { timeZone: 'Europe/Paris', hour: '2-digit', minute:'2-digit' });
        
        // Find a DB entry matching this hour and minute
        const match = historyRaw.find(item => item.timestamp.getHours() === slotTime.getHours() && item.timestamp.getMinutes() === slotTime.getMinutes());
        
        if (match) {
          const rawSolar = Math.round(Math.abs(match.power_b));
          const solarVal = rawSolar > 5 ? rawSolar : 0;
          const chauffeVal = Math.round(match.power_c);
          history.push({
            time: timeStr,
            Maison: Math.max(0, Math.round(match.power_a + solarVal - chauffeVal)),
            Solaire: solarVal,
            ChauffeEau: chauffeVal
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
    } else {
      // Generate exactly 60 slots (00 to 59)
      for (let i = 0; i < 60; i++) {
        const slotTime = new Date(startDate);
        slotTime.setMinutes(i);
        
        const timeStr = slotTime.toLocaleTimeString('fr-FR', { timeZone: 'Europe/Paris', hour: '2-digit', minute:'2-digit' });
        
        const match = historyRaw.find(item => item.timestamp.getMinutes() === i);
        
        if (match) {
          const rawSolar = Math.round(Math.abs(match.power_b));
          const solarVal = rawSolar > 5 ? rawSolar : 0;
          const chauffeVal = Math.round(match.power_c);
          history.push({
            time: timeStr,
            Maison: Math.max(0, Math.round(match.power_a + solarVal - chauffeVal)),
            Solaire: solarVal,
            ChauffeEau: chauffeVal
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
    }

    return NextResponse.json({
      history,
      targetDate: startDate.toISOString()
    });
  } catch (error) {
    console.error("Error fetching Shelly history:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
