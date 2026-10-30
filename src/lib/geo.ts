import { DISTRICT_BY_CODE } from "@/data/geography";

export type Point = { latitude: number; longitude: number };

const EARTH_RADIUS_KM = 6371;

/** Great-circle distance in kilometres. */
export function haversineKm(a: Point, b: Point): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function districtCentroid(districtCode: string): Point | null {
  const district = DISTRICT_BY_CODE.get(districtCode);
  if (!district) return null;
  return { latitude: district.latitude, longitude: district.longitude };
}

/**
 * Distance between two districts, measured between their headquarters.
 * This is a coarse proximity signal, not the distance to a donor's home.
 */
export function districtDistanceKm(from: string, to: string): number | null {
  if (from === to) return 0;
  const a = districtCentroid(from);
  const b = districtCentroid(to);
  if (!a || !b) return null;
  return Math.round(haversineKm(a, b) * 10) / 10;
}

export function roundKm(value: number): number {
  return Math.round(value * 10) / 10;
}
