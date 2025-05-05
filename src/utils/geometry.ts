import { Point } from '../models/types';

/**
 * Calculate the intersection point between a line and a wall
 * @param lineStart Start point of the line segment
 * @param lineEnd End point of the line segment
 * @param wall The wall identifier (top, right, bottom, left)
 * @param roomWidth Width of the room in grid units
 * @param roomHeight Height of the room in grid units
 * @returns The intersection point or null if no intersection
 */
export function intersectLineWithWall(
  lineStart: Point,
  lineEnd: Point,
  wall: string,
  roomWidth: number,
  roomHeight: number
): Point | null {
  // Define wall coordinates
  const wallLines = {
    top: { x1: 0, y1: 0, x2: roomWidth, y2: 0 },
    right: { x1: roomWidth, y1: 0, x2: roomWidth, y2: roomHeight },
    bottom: { x1: 0, y1: roomHeight, x2: roomWidth, y2: roomHeight },
    left: { x1: 0, y1: 0, x2: 0, y2: roomHeight }
  };

  // Get the wall line coordinates
  const wallLine = wallLines[wall as keyof typeof wallLines];
  if (!wallLine) return null;

  // Line segment parameters
  const x1 = lineStart.x;
  const y1 = lineStart.y;
  const x2 = lineEnd.x;
  const y2 = lineEnd.y;

  // Wall line parameters
  const x3 = wallLine.x1;
  const y3 = wallLine.y1;
  const x4 = wallLine.x2;
  const y4 = wallLine.y2;

  // Calculate the denominator for the line intersection formula
  const denominator = (y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1);

  // If denominator is 0, lines are parallel or collinear
  if (denominator === 0) return null;

  // Calculate parameters for the intersection point
  const ua = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / denominator;
  const ub = ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) / denominator;

  // Check if the intersection point lies on both line segments
  if (ua < 0 || ua > 1 || ub < 0 || ub > 1) return null;

  // Calculate the intersection point
  const intersectionX = x1 + ua * (x2 - x1);
  const intersectionY = y1 + ua * (y2 - y1);

  // Small epsilon to prevent floating point precision issues
  const epsilon = 0.0001;

  // Additional validation: check if the intersection point actually lies on the wall
  if (
    wall === 'top' && 
    (intersectionY > epsilon || intersectionX < -epsilon || intersectionX > roomWidth + epsilon)
  ) {
    return null;
  } else if (
    wall === 'right' && 
    (intersectionX < roomWidth - epsilon || intersectionY < -epsilon || intersectionY > roomHeight + epsilon)
  ) {
    return null;
  } else if (
    wall === 'bottom' && 
    (intersectionY < roomHeight - epsilon || intersectionX < -epsilon || intersectionX > roomWidth + epsilon)
  ) {
    return null;
  } else if (
    wall === 'left' && 
    (intersectionX > epsilon || intersectionY < -epsilon || intersectionY > roomHeight + epsilon)
  ) {
    return null;
  }

  return { x: intersectionX, y: intersectionY };
}

/**
 * Calculate the reflection of a point through a wall
 * @param point Point to reflect
 * @param wall Wall to reflect through (top, right, bottom, left)
 * @param roomWidth Width of the room
 * @param roomHeight Height of the room
 * @returns The reflected point
 */
export function reflectPointThroughWall(
  point: Point,
  wall: string,
  roomWidth: number,
  roomHeight: number
): Point {
  switch (wall) {
    case 'top':
      return { x: point.x, y: -point.y };
    case 'right':
      return { x: 2 * roomWidth - point.x, y: point.y };
    case 'bottom':
      return { x: point.x, y: 2 * roomHeight - point.y };
    case 'left':
      return { x: -point.x, y: point.y };
    default:
      return point;
  }
}

/**
 * Calculate the reflected ray direction after hitting a wall
 * @param incidentVector The incoming ray vector
 * @param wall The wall that was hit
 * @returns The reflected vector
 */
export function calculateReflectionVector(incidentVector: Point, wall: string): Point {
  const normalizeFactor = Math.sqrt(
    incidentVector.x * incidentVector.x + incidentVector.y * incidentVector.y
  );
  
  const normalizedVector = {
    x: incidentVector.x / normalizeFactor,
    y: incidentVector.y / normalizeFactor
  };

  // Get the normal vector for the wall
  let normalVector: Point;
  switch (wall) {
    case 'top': 
      normalVector = { x: 0, y: 1 };
      break;
    case 'right': 
      normalVector = { x: -1, y: 0 };
      break;
    case 'bottom': 
      normalVector = { x: 0, y: -1 };
      break;
    case 'left': 
      normalVector = { x: 1, y: 0 };
      break;
    default:
      return normalizedVector;
  }

  // Calculate the dot product of incident and normal
  const dotProduct = 
    normalizedVector.x * normalVector.x + 
    normalizedVector.y * normalVector.y;

  // Calculate the reflection vector: r = i - 2(i·n)n
  const reflectedVector = {
    x: normalizedVector.x - 2 * dotProduct * normalVector.x,
    y: normalizedVector.y - 2 * dotProduct * normalVector.y
  };

  return reflectedVector;
}

/**
 * Checks if two line segments intersect
 * @param line1Start Start point of first line
 * @param line1End End point of first line
 * @param line2Start Start point of second line
 * @param line2End End point of second line
 * @returns True if the lines intersect, false otherwise
 */
export function doLinesIntersect(
  line1Start: Point,
  line1End: Point,
  line2Start: Point,
  line2End: Point
): boolean {
  // Calculate orientation of triplets to determine if they intersect
  function orientation(p: Point, q: Point, r: Point): number {
    const val = (q.y - p.y) * (r.x - q.x) - (q.x - p.x) * (r.y - q.y);
    if (val === 0) return 0; // Collinear
    return val > 0 ? 1 : 2; // Clockwise or counterclockwise
  }

  // Check if point q is on segment pr
  function onSegment(p: Point, q: Point, r: Point): boolean {
    return (
      q.x <= Math.max(p.x, r.x) &&
      q.x >= Math.min(p.x, r.x) &&
      q.y <= Math.max(p.y, r.y) &&
      q.y >= Math.min(p.y, r.y)
    );
  }

  const o1 = orientation(line1Start, line1End, line2Start);
  const o2 = orientation(line1Start, line1End, line2End);
  const o3 = orientation(line2Start, line2End, line1Start);
  const o4 = orientation(line2Start, line2End, line1End);

  // General case: different orientations
  if (o1 !== o2 && o3 !== o4) return true;

  // Special cases: collinear points
  if (o1 === 0 && onSegment(line1Start, line2Start, line1End)) return true;
  if (o2 === 0 && onSegment(line1Start, line2End, line1End)) return true;
  if (o3 === 0 && onSegment(line2Start, line1Start, line2End)) return true;
  if (o4 === 0 && onSegment(line2Start, line1End, line2End)) return true;

  return false;
}

/**
 * Compute the distance between two points
 * @param p1 First point
 * @param p2 Second point
 * @returns The Euclidean distance between the points
 */
export function distance(p1: Point, p2: Point): number {
  return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
} 