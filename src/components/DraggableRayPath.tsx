import React, { useState, useEffect, useRef } from 'react';
import { Point, PlacedObject, Room } from '../models/types';
import { intersectLineWithWall } from '../utils/geometry';

export interface DraggableRayPathProps {
  virtualObject: PlacedObject;
  observer: PlacedObject;
  rooms: Room[];
  roomSize: number;
  roomWidth: number;
  roomHeight: number;
  onPathComplete: (virtualObject: PlacedObject, endpoint: Point, passedRoomIds: string[]) => void;
}

/**
 * A component that allows a user to drag a ray path from a virtual object to the observer.
 * This path will be used to create a ray trace and eventually fold the virtual room.
 */
const DraggableRayPath: React.FC<DraggableRayPathProps> = ({
  virtualObject,
  observer,
  rooms,
  roomSize,
  roomWidth,
  roomHeight,
  onPathComplete
}) => {
  const [isActive, setIsActive] = useState(false);
  const [currentPath, setCurrentPath] = useState<Point[]>([]);
  const [passedRoomIds, setPassedRoomIds] = useState<string[]>([]);
  const svgRef = useRef<SVGSVGElement>(null);

  // Initialize with the source virtual object
  useEffect(() => {
    const initialPoint = getGlobalCoordinates(virtualObject.position, virtualObject.roomId);
    setCurrentPath([initialPoint]);
    
    // Initial room is the one containing virtual object
    setPassedRoomIds([virtualObject.roomId]);
  }, [virtualObject]);

  // Convert local room coordinates to global coordinates
  const getGlobalCoordinates = (point: Point, roomId: string): Point => {
    const room = rooms.find(r => r.id === roomId);
    if (!room) return point;

    return {
      x: room.position.x * roomSize + (point.x * roomSize / roomWidth),
      y: room.position.y * roomSize + (point.y * roomSize / roomHeight)
    };
  };

  // Convert global coordinates to local room coordinates
  const getLocalCoordinates = (point: Point, roomId: string): Point => {
    const room = rooms.find(r => r.id === roomId);
    if (!room) return point;

    return {
      x: (point.x - room.position.x * roomSize) / (roomSize / roomWidth),
      y: (point.y - room.position.y * roomSize) / (roomSize / roomHeight)
    };
  };

  // Get the room that contains the given global coordinates
  const getRoomAtPoint = (point: Point): Room | undefined => {
    return rooms.find(room => {
      const roomLeft = room.position.x * roomSize;
      const roomRight = roomLeft + roomSize;
      const roomTop = room.position.y * roomSize;
      const roomBottom = roomTop + roomSize;
      
      return point.x >= roomLeft && point.x <= roomRight && 
             point.y >= roomTop && point.y <= roomBottom;
    });
  };

  // Trace the ray path through rooms, checking for wall intersections
  const traceRayPath = (startGlobal: Point, endGlobal: Point): {
    path: Point[], 
    passedRooms: string[]
  } => {
    let path: Point[] = [startGlobal];
    let currentPoint = startGlobal;
    let targetPoint = endGlobal;
    let passedRooms = new Set<string>();
    
    // Add source room
    const startRoom = getRoomAtPoint(startGlobal);
    if (startRoom) passedRooms.add(startRoom.id);
    
    // Maximum number of reflections to prevent infinite loops
    const MAX_REFLECTIONS = 10;
    let reflectionCount = 0;
    
    while (reflectionCount < MAX_REFLECTIONS) {
      // Find room we're currently in
      const currentRoom = getRoomAtPoint(currentPoint);
      if (!currentRoom) break;
      
      passedRooms.add(currentRoom.id);
      
      // Convert to local coordinates for intersection calculation
      const localCurrent = getLocalCoordinates(currentPoint, currentRoom.id);
      const localTarget = getLocalCoordinates(targetPoint, currentRoom.id);
      
      // Check if the ray intersects any mirrors in the current room
      let closestIntersection: {
        wallId: string;
        point: Point;
        distance: number;
      } | null = null;
      
      // Calculate intersections with all walls
      const wallsArray = currentRoom.walls || [];
      for (const wall of wallsArray) {
        const wallId = `${currentRoom.id}-${wall}`;
        const intersection = intersectLineWithWall(
          localCurrent, 
          localTarget, 
          wall, 
          roomWidth, 
          roomHeight
        );
        
        if (intersection) {
          const distance = Math.sqrt(
            Math.pow(intersection.x - localCurrent.x, 2) + 
            Math.pow(intersection.y - localCurrent.y, 2)
          );
          
          if (!closestIntersection || distance < closestIntersection.distance) {
            closestIntersection = {
              wallId,
              point: intersection,
              distance
            };
          }
        }
      }
      
      if (closestIntersection) {
        // Convert intersection point back to global coordinates
        const globalIntersection = getGlobalCoordinates(
          closestIntersection.point, 
          currentRoom.id
        );
        
        // Add intersection point to path
        path.push(globalIntersection);
        
        // Update current point to be the intersection
        currentPoint = globalIntersection;
        
        // TODO: Calculate reflection vector and continue ray tracing
        // For simplicity, we'll just break after first intersection
        break;
      } else {
        // No intersection, ray goes straight to target
        path.push(targetPoint);
        
        // Add target room if not already passed
        const targetRoom = getRoomAtPoint(targetPoint);
        if (targetRoom) passedRooms.add(targetRoom.id);
        
        break;
      }
      
      reflectionCount++;
    }
    
    return { path, passedRooms: Array.from(passedRooms) };
  };

  // Handle mouse move event to update ray path
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!isActive || !svgRef.current) return;
    
    // Get mouse position relative to SVG
    const svg = svgRef.current;
    const rect = svg.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Start from virtual object position
    const start = currentPath[0];
    
    // Trace ray path from object to current mouse position
    const { path, passedRooms } = traceRayPath(start, { x, y });
    
    // Update state
    setCurrentPath(path);
    setPassedRoomIds(passedRooms);
  };

  // Handle mouse down to start dragging
  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    setIsActive(true);
  };

  // Handle mouse up to complete path
  const handleMouseUp = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!isActive) return;
    
    // Check if the final point is near the observer
    const observerGlobal = getGlobalCoordinates(observer.position, observer.roomId);
    const finalPoint = currentPath[currentPath.length - 1];
    const distance = Math.sqrt(
      Math.pow(finalPoint.x - observerGlobal.x, 2) + 
      Math.pow(finalPoint.y - observerGlobal.y, 2)
    );
    
    // Complete path if close enough to observer
    const OBSERVER_THRESHOLD = 50; // Pixels
    if (distance <= OBSERVER_THRESHOLD) {
      onPathComplete(virtualObject, { 
        x: finalPoint.x, 
        y: finalPoint.y 
      }, passedRoomIds);
    }
    
    setIsActive(false);
  };

  return (
    <svg
      ref={svgRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        cursor: isActive ? 'crosshair' : 'pointer',
        zIndex: 1000,
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      {currentPath.length > 1 && (
        <polyline
          points={currentPath.map(p => `${p.x},${p.y}`).join(' ')}
          stroke="#ff0000"
          strokeWidth={2}
          fill="none"
          strokeDasharray="5,5"
        />
      )}
      
      {/* Show reflection points */}
      {currentPath.slice(1, -1).map((point, index) => (
        <circle
          key={index}
          cx={point.x}
          cy={point.y}
          r={4}
          fill="#ff0000"
        />
      ))}
      
      {/* Show start point (virtual object) */}
      {currentPath.length > 0 && (
        <circle
          cx={currentPath[0].x}
          cy={currentPath[0].y}
          r={6}
          fill="magenta"
        />
      )}
      
      {/* Show endpoint if dragging */}
      {isActive && currentPath.length > 1 && (
        <circle
          cx={currentPath[currentPath.length - 1].x}
          cy={currentPath[currentPath.length - 1].y}
          r={6}
          fill="#ff0000"
          opacity={0.5}
        />
      )}
    </svg>
  );
};

export default DraggableRayPath; 