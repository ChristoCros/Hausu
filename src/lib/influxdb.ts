import { InfluxDB, Point } from '@influxdata/influxdb-client';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const url = process.env.INFLUXDB_URL || '';
const token = process.env.INFLUXDB_TOKEN || '';
const org = process.env.INFLUXDB_ORG || '';
const bucket = process.env.INFLUXDB_BUCKET || '';

if (!url || !token || !org || !bucket) {
  console.warn('InfluxDB configuration is missing in environment variables.');
}

export const influxDB = new InfluxDB({ url, token });
export const writeApi = influxDB.getWriteApi(org, bucket, 'ns');
export const queryApi = influxDB.getQueryApi(org);

export { Point, bucket, org };
