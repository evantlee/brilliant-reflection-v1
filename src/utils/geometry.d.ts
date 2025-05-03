import { Point } from '../models/types';

export function intersectLineWithWall(
  lineStart: Point,
  lineEnd: Point,
  wall: string,
  roomWidth: number,
  roomHeight: number
): Point | null;

export function reflectPointThroughWall(
  point: Point,
  wall: string,
  roomWidth: number,
  roomHeight: number
): Point;

export function calculateReflectionVector(
  incidentVector: Point, 
  wall: string
): Point;

export function doLinesIntersect(
  line1Start: Point,
  line1End: Point,
  line2Start: Point,
  line2End: Point
): boolean;

export function distance(p1: Point, p2: Point): number; 