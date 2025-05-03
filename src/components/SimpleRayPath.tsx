import React from 'react';
import { Point, PlacedObject, Room } from '../models/types';

interface SimpleRayPathProps {
  virtualObject: PlacedObject;
  observer: { position: Point };
  rooms: Room[];
  roomSize: number;
  roomWidth: number;
  roomHeight: number;
}

/**
 * A simplified ray path component that draws a straight line from a virtual object to the observer.
 * This represents how a user would directly view the virtual image.
 */
const SimpleRayPath: React.FC<SimpleRayPathProps> = ({
  virtualObject,
  observer,
  rooms,
  roomSize,
  roomWidth,
  roomHeight
}) => {
  // Find the original room (with reflection order 0)
  const originalRoom = rooms.find(r => r.reflectionOrder === 0);
  
  if (!originalRoom) {
    console.error('Original room not found');
    return null;
  }

  // Convert room local coordinates to global coordinates
  const getGlobalCoordinates = (point: Point, roomId: string): Point => {
    const room = rooms.find(r => r.id === roomId);
    if (!room) return point;

    return {
      x: room.position.x * roomSize + ((point.x + 0.5) * roomSize / roomWidth),
      y: room.position.y * roomSize + ((point.y + 0.5) * roomSize / roomHeight)
    };
  };

  // Get the global coordinates of the virtual object and observer
  const virtualObjectGlobal = getGlobalCoordinates(virtualObject.position, virtualObject.roomId);
  const observerGlobal = getGlobalCoordinates(observer.position, originalRoom.id);

  // Calculate room boundaries in global coordinates
  const roomLeft = originalRoom.position.x * roomSize;
  const roomRight = roomLeft + roomSize;
  const roomTop = originalRoom.position.y * roomSize;
  const roomBottom = roomTop + roomSize;

  // Check if the ray passes through the original room using simplified line-rectangle intersection
  const isVisible = lineIntersectsRectangle(
    virtualObjectGlobal, 
    observerGlobal,
    { x: roomLeft, y: roomTop },
    { x: roomRight, y: roomBottom }
  );

  // Calculate midpoint for label position
  const midX = (virtualObjectGlobal.x + observerGlobal.x) / 2;
  const midY = (virtualObjectGlobal.y + observerGlobal.y) / 2;

  // We're not using these calculations anymore since we'll use a fixed position SVG
  // that spans the entire viewport
  const allRoomPositions = rooms.map(r => ({
    left: r.position.x * roomSize,
    right: (r.position.x + 1) * roomSize,
    top: r.position.y * roomSize,
    bottom: (r.position.y + 1) * roomSize
  }));

  return (
    <div className="ray-path-container" style={{ 
      position: 'absolute', 
      top: 0, 
      left: 0, 
      right: 0, 
      bottom: 0,
      pointerEvents: 'none',
      zIndex: 100 
    }}>
      <svg 
        className="ray-path" 
        style={{ 
          position: 'fixed', 
          top: 0, 
          left: 0, 
          width: '100%', 
          height: '100%', 
          pointerEvents: 'none'
        }}
      >
        {/* Main ray from virtual object to observer */}
        <line
          x1={virtualObjectGlobal.x}
          y1={virtualObjectGlobal.y}
          x2={observerGlobal.x}
          y2={observerGlobal.y}
          stroke={isVisible ? '#ff0000' : '#ffcccc'}
          strokeWidth={2}
          strokeDasharray={isVisible ? '0' : '5,5'}
        />
        
        {/* Add markers at end points */}
        <circle
          cx={virtualObjectGlobal.x}
          cy={virtualObjectGlobal.y}
          r={4}
          fill={isVisible ? '#ff0000' : '#ffcccc'}
        />
        <circle
          cx={observerGlobal.x}
          cy={observerGlobal.y}
          r={4}
          fill={isVisible ? '#ff0000' : '#ffcccc'}
        />

        {/* Add visibility label */}
        <g transform={`translate(${midX}, ${midY})`}>
          <rect
            x="-40"
            y="-12"
            width="80"
            height="24"
            rx="4"
            fill="white"
            fillOpacity="0.8"
            stroke={isVisible ? '#ff0000' : '#ffcccc'}
          />
          <text
            textAnchor="middle"
            y="5"
            fontSize="12"
            fontFamily="Arial, sans-serif"
            fill={isVisible ? '#ff0000' : '#ffcccc'}
          >
            {isVisible ? 'VISIBLE' : 'NOT VISIBLE'}
          </text>
        </g>
      </svg>
    </div>
  );
};

/**
 * Checks if a line segment intersects with a rectangle
 * 
 * @param lineStart Start point of the line
 * @param lineEnd End point of the line
 * @param rectMin Top-left corner of the rectangle
 * @param rectMax Bottom-right corner of the rectangle
 * @returns True if the line intersects the rectangle
 */
function lineIntersectsRectangle(
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
    if (lineSegmentsIntersect(lineStart, lineEnd, edge.start, edge.end)) {
      return true;
    }
  }

  return false;
}

/**
 * Checks if a point is inside a rectangle
 */
function pointInRectangle(point: Point, rectMin: Point, rectMax: Point): boolean {
  return (
    point.x >= rectMin.x && 
    point.x <= rectMax.x && 
    point.y >= rectMin.y && 
    point.y <= rectMax.y
  );
}

/**
 * Checks if two line segments intersect
 */
function lineSegmentsIntersect(
  line1Start: Point, 
  line1End: Point, 
  line2Start: Point, 
  line2End: Point
): boolean {
  // Calculate direction vectors
  const d1x = line1End.x - line1Start.x;
  const d1y = line1End.y - line1Start.y;
  const d2x = line2End.x - line2Start.x;
  const d2y = line2End.y - line2Start.y;

  // Calculate the determinant
  const det = d1x * d2y - d1y * d2x;

  // If determinant is zero, lines are parallel
  if (det === 0) return false;

  // Calculate the parametric coordinates
  const dx = line2Start.x - line1Start.x;
  const dy = line2Start.y - line1Start.y;

  const t = (dx * d2y - dy * d2x) / det;
  const u = (dx * d1y - dy * d1x) / det;

  // Check if intersection is within both line segments
  return t >= 0 && t <= 1 && u >= 0 && u <= 1;
}

export default SimpleRayPath; 