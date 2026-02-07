
import { Coordinate } from '../types';

/**
 * Calculates the great-circle distance between two points on a sphere.
 */
export const calculateDistance = (p1: Coordinate, p2: Coordinate): number => {
  const R = 6371; // Earth's radius in km
  const dLat = (p2.lat - p1.lat) * (Math.PI / 180);
  const dLng = (p2.lng - p1.lng) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(p1.lat * (Math.PI / 180)) *
      Math.cos(p2.lat * (Math.PI / 180)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

/**
 * Normalizes heading to 0-360
 */
export const normalizeHeading = (heading: number | null): number => {
  if (heading === null) return 0;
  let h = heading % 360;
  if (h < 0) h += 360;
  return h;
};
