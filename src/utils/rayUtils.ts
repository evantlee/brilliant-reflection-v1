/**
 * Ray Tracing Utilities
 * 
 * This file contains simplified utility functions for ray tracing in the reflection sandbox.
 * It focuses on the direct ray path from virtual objects to observer, showing how
 * light would travel in straight lines through reflection.
 */
import { Point, Room } from '../models/types';

/**
 * Calculate distance between two points
 */
export function distance(p1: Point, p2: Point): number {
  return Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2);
}

/**
 * Convert local room coordinates to global pixel coordinates
 */
export function getGlobalCoordinates(
  point: Point, 
  room: Room,
  roomSize: number,
  gridWidth: number,
  gridHeight: number
): Point {
  return {
    x: room.position.x * roomSize + ((point.x + 0.5) * roomSize / gridWidth),
    y: room.position.y * roomSize + ((point.y + 0.5) * roomSize / gridHeight)
  };
}

/**
 * Find the intersection point of two line segments
 */
export function findLineIntersection(
  line1Start: Point, 
  line1End: Point, 
  line2Start: Point, 
  line2End: Point
): Point | null {
  // Calculate direction vectors
  const d1x = line1End.x - line1Start.x;
  const d1y = line1End.y - line1Start.y;
  const d2x = line2End.x - line2Start.x;
  const d2y = line2End.y - line2Start.y;

  // Calculate the determinant
  const det = d1x * d2y - d1y * d2x;

  // If determinant is zero, lines are parallel
  if (Math.abs(det) < 0.001) return null;

  // Calculate the parametric coordinates
  const dx = line2Start.x - line1Start.x;
  const dy = line2Start.y - line1Start.y;

  const t = (dx * d2y - dy * d2x) / det;
  const u = (dx * d1y - dy * d1x) / det;

  // Check if intersection is within both line segments
  if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
    return {
      x: line1Start.x + t * d1x,
      y: line1Start.y + t * d1y
    };
  }
  
  return null;
}

/**
 * Find the intersections of a ray with all room boundaries using a parametric slab algorithm
 * 
 * This function calculates where a ray (from start to end) intersects with each room's boundaries
 * and returns a list of segments ordered by parametric distance along the ray. Each segment 
 * represents a portion of the ray passing through a particular room.
 * 
 * The algorithm uses a "slab" method:
 * 1. For each room, we compute where the ray enters and exits the room's X and Y bounds
 * 2. The actual room intersection is the overlap of these two intervals (max entry, min exit)
 * 3. We then sort all valid segments by their parametric entry point (t0)
 * 4. We deduplicate overlapping segments, keeping only the one with lowest reflection order
 * 
 * When multiple virtual rooms overlap (due to higher-order reflections), we always select
 * the room with the lowest reflection order, as this represents the shortest physical path
 * that light would actually take.
 * 
 * @param start The starting point of the ray (virtual object position)
 * @param end The ending point of the ray (observer position)
 * @param rooms Array of all rooms to check for intersections
 * @param roomSize The size of each room in pixels
 * @returns Array of segments with parametric intervals [t0,t1] and roomId
 */
export function findRayRoomIntersections(
  start: Point,
  end: Point,
  rooms: Room[],
  roomSize: number
): Array<{ t0: number; t1: number; roomId: string }> {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const rawSegments: Array<{ t0: number; t1: number; roomId: string; reflectionOrder: number }> = [];

  for (const room of rooms) {
    // Compute slab intervals for this room
    const left = room.position.x * roomSize;
    const right = left + roomSize;
    const top = room.position.y * roomSize;
    const bottom = top + roomSize;

    // Parametric t for intersections with x slabs
    let tx0 = dx !== 0 ? (left - start.x) / dx : -Infinity;
    let tx1 = dx !== 0 ? (right - start.x) / dx : Infinity;
    if (tx0 > tx1) [tx0, tx1] = [tx1, tx0];

    // Parametric t for intersections with y slabs
    let ty0 = dy !== 0 ? (top - start.y) / dy : -Infinity;
    let ty1 = dy !== 0 ? (bottom - start.y) / dy : Infinity;
    if (ty0 > ty1) [ty0, ty1] = [ty1, ty0];

    // Overlap of intervals
    const tEnter = Math.max(tx0, ty0);
    const tExit  = Math.min(tx1, ty1);

    // If they overlap and intersect segment
    if (tEnter < tExit && tExit > 0 && tEnter < 1) {
      const clampedEnter = Math.max(tEnter, 0);
      const clampedExit  = Math.min(tExit, 1);
      rawSegments.push({ 
        t0: clampedEnter, 
        t1: clampedExit, 
        roomId: room.id,
        reflectionOrder: room.reflectionOrder || Infinity 
      });
    }
  }

  // Sort by entry time (t0) first, then by reflection order
  rawSegments.sort((a, b) => a.t0 !== b.t0 ? a.t0 - b.t0 : a.reflectionOrder - b.reflectionOrder);

  // Deduplicate overlapping segments to keep only the one with the lowest reflection order
  const uniqueSegments: Array<{ t0: number; t1: number; roomId: string; reflectionOrder: number }> = [];
  const EPSILON = 0.0001; // Tolerance for floating point comparisons
  
  for (const segment of rawSegments) {
    // Find an existing segment that completely contains this one
    const overlapIndex = uniqueSegments.findIndex(s => 
      Math.abs(s.t0 - segment.t0) < EPSILON && 
      Math.abs(s.t1 - segment.t1) < EPSILON
    );
    
    if (overlapIndex >= 0) {
      // If current segment has lower reflection order, replace the existing one
      if (segment.reflectionOrder < uniqueSegments[overlapIndex].reflectionOrder) {
        uniqueSegments[overlapIndex] = segment;
      }
    } else {
      // No overlap, add as a new segment
      uniqueSegments.push(segment);
    }
  }

  // Return cleaned segments without the reflectionOrder property
  return uniqueSegments.map(({ t0, t1, roomId }) => ({ t0, t1, roomId }));
}

/**
 * Checks if a point is inside a rectangle
 */
export function pointInRectangle(point: Point, rectMin: Point, rectMax: Point): boolean {
  return (
    point.x >= rectMin.x && 
    point.x <= rectMax.x && 
    point.y >= rectMin.y && 
    point.y <= rectMax.y
  );
}

/**
 * Checks if a line segment intersects with a rectangle
 */
export function lineIntersectsRectangle(
  lineStart: Point,
  lineEnd: Point,
  rectMin: Point,
  rectMax: Point
): boolean {
  // Check if either endpoint is inside the rectangle
  if (pointInRectangle(lineStart, rectMin, rectMax) || 
      pointInRectangle(lineEnd, rectMin, rectMax)) {
    return true;
  }

  // Check if the line intersects any of the rectangle edges
  const edges = [
    // Top edge
    { start: { x: rectMin.x, y: rectMin.y }, end: { x: rectMax.x, y: rectMin.y } },
    // Right edge
    { start: { x: rectMax.x, y: rectMin.y }, end: { x: rectMax.x, y: rectMax.y } },
    // Bottom edge
    { start: { x: rectMin.x, y: rectMax.y }, end: { x: rectMax.x, y: rectMax.y } },
    // Left edge
    { start: { x: rectMin.x, y: rectMin.y }, end: { x: rectMin.x, y: rectMax.y } }
  ];

  // Check if the line intersects any edge
  for (const edge of edges) {
    if (findLineIntersection(lineStart, lineEnd, edge.start, edge.end) !== null) {
      return true;
    }
  }

  return false;
} 