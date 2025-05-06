import { Room, Point, RayPath } from '../models/types';

/**
 * Calculate the transform origin point for folding animation
 */
export const calculateTransformOrigin = (
  wall: 'top' | 'right' | 'bottom' | 'left'
): string => {
  switch (wall) {
    case 'top':
      return '50% 0%';  // Center top
    case 'right':
      return '100% 50%'; // Right center
    case 'bottom':
      return '50% 100%'; // Center bottom
    case 'left':
      return '0% 50%';  // Left center
    default:
      return '50% 50%'; // Center (fallback)
  }
};

/**
 * Get rotation properties for a wall
 */
export const getRotationForWall = (
  wall: 'top' | 'right' | 'bottom' | 'left'
): { property: string; value: number } => {
  switch (wall) {
    case 'top':
      return { property: 'rotateX', value: -180 };
    case 'right':
      return { property: 'rotateY', value: 180 };
    case 'bottom':
      return { property: 'rotateX', value: 180 };
    case 'left':
      return { property: 'rotateY', value: -180 };
    default:
      return { property: 'rotate', value: 0 };
  }
};

/**
 * Get the opposite wall direction
 */
export const getOppositeWall = (
  wall: 'top' | 'right' | 'bottom' | 'left'
): 'top' | 'right' | 'bottom' | 'left' => {
  switch (wall) {
    case 'top': return 'bottom';
    case 'right': return 'left';
    case 'bottom': return 'top';
    case 'left': return 'right';
    default: return wall;
  }
};

/**
 * Reflect a point across a wall
 * This uses the same logic as virtual image placement
 */
export const reflectPointOverWall = (
  point: Point,
  wall: 'top' | 'right' | 'bottom' | 'left',
  roomPosition: Point,
  roomSize: number
): Point => {
  // Calculate room boundaries in absolute coordinates
  const roomLeft = roomPosition.x * roomSize;
  const roomRight = roomLeft + roomSize;
  const roomTop = roomPosition.y * roomSize;
  const roomBottom = roomTop + roomSize;
  
  // Determine the reflection axis and perform the reflection
  switch (wall) {
    case 'top':
      // Reflect across the top wall (horizontal axis at room's top edge)
      return { 
        x: point.x, 
        y: 2 * roomTop - point.y  // Reflection formula: 2 * axis_position - point_coordinate
      };
    case 'right':
      // Reflect across the right wall (vertical axis at room's right edge)
      return { 
        x: 2 * roomRight - point.x, 
        y: point.y 
      };
    case 'bottom':
      // Reflect across the bottom wall (horizontal axis at room's bottom edge)
      return { 
        x: point.x, 
        y: 2 * roomBottom - point.y 
      };
    case 'left':
      // Reflect across the left wall (vertical axis at room's left edge)
      return { 
        x: 2 * roomLeft - point.x, 
        y: point.y 
      };
    default:
      // If invalid wall, return the original point
      console.warn(`Invalid wall direction: ${wall}`);
      return point;
  }
};

/**
 * Find the wall a ray segment intersects with
 */
export const findSegmentWallIntersection = (
  start: Point,
  end: Point,
  room: Room,
  roomSize: number
): { wall: 'top' | 'right' | 'bottom' | 'left' | null; intersectionPoint: Point | null } => {
  const roomLeft = room.position.x * roomSize;
  const roomRight = roomLeft + roomSize;
  const roomTop = room.position.y * roomSize;
  const roomBottom = roomTop + roomSize;
  
  // Line equation parameters: y = mx + b
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const m = dx === 0 ? Number.MAX_VALUE : dy / dx;
  const b = start.y - m * start.x;
  
  // Check each wall for intersection
  interface Intersection {
    wall: 'top' | 'right' | 'bottom' | 'left';
    x: number;
    y: number;
    distance: number;
    isValid: boolean;
  }
  
  const checkWalls: Intersection[] = [
    // Top wall
    {
      wall: 'top',
      y: roomTop,
      x: m === Number.MAX_VALUE ? start.x : (roomTop - b) / m,
      distance: 0,
      isValid: false
    },
    // Right wall
    {
      wall: 'right',
      x: roomRight,
      y: m * roomRight + b,
      distance: 0,
      isValid: false
    },
    // Bottom wall
    {
      wall: 'bottom',
      y: roomBottom,
      x: m === Number.MAX_VALUE ? start.x : (roomBottom - b) / m,
      distance: 0,
      isValid: false
    },
    // Left wall
    {
      wall: 'left',
      x: roomLeft,
      y: m * roomLeft + b,
      distance: 0,
      isValid: false
    }
  ];
  
  // Validate each intersection
  checkWalls.forEach(intersection => {
    // Check if point is on the wall
    if (
      intersection.wall === 'top' || intersection.wall === 'bottom'
    ) {
      intersection.isValid = 
        intersection.x >= roomLeft && 
        intersection.x <= roomRight;
    } else {
      intersection.isValid = 
        intersection.y >= roomTop && 
        intersection.y <= roomBottom;
    }
    
    // Check if intersection is between start and end points
    if (intersection.isValid) {
      const withinSegment = 
        intersection.x >= Math.min(start.x, end.x) - 0.001 && 
        intersection.x <= Math.max(start.x, end.x) + 0.001 &&
        intersection.y >= Math.min(start.y, end.y) - 0.001 && 
        intersection.y <= Math.max(start.y, end.y) + 0.001;
      
      intersection.isValid = intersection.isValid && withinSegment;
    }
    
    // Calculate distance from start point
    if (intersection.isValid) {
      intersection.distance = Math.sqrt(
        Math.pow(intersection.x - start.x, 2) + 
        Math.pow(intersection.y - start.y, 2)
      );
    } else {
      intersection.distance = Number.MAX_VALUE;
    }
  });
  
  // Find the closest valid intersection
  const validIntersections = checkWalls.filter(i => i.isValid);
  if (validIntersections.length === 0) {
    return { wall: null, intersectionPoint: null };
  }
  
  // Sort by distance and get the closest
  validIntersections.sort((a, b) => a.distance - b.distance);
  const closest = validIntersections[0];
  
  return {
    wall: closest.wall,
    intersectionPoint: { x: closest.x, y: closest.y }
  };
};

/**
 * Find room after crossing a wall - used to trace path from virtual to original room
 */
export const findRoomAfterWall = (
  currentRoom: Room,
  wall: 'top' | 'right' | 'bottom' | 'left',
  rooms: Room[]
): Room | null => {
  // Calculate position of the room on the other side of the wall
  const nextPosition = { ...currentRoom.position };
  
  switch (wall) {
    case 'top': nextPosition.y--; break;
    case 'right': nextPosition.x++; break;
    case 'bottom': nextPosition.y++; break;
    case 'left': nextPosition.x--; break;
  }
  
  // Find the room at that position
  return rooms.find(r => 
    r.position.x === nextPosition.x && 
    r.position.y === nextPosition.y
  ) || null;
};

/**
 * Get the sequence of folds needed to go from virtual room to original room.
 * The sequence starts from the virtual object's room and works backward to the original room.
 */
export const getFoldingSequence = (
  rayPath: RayPath,
  rooms: Room[],
  originalRoomId: string,
  roomSize: number
): { 
  roomId: string; 
  wall: 'top' | 'right' | 'bottom' | 'left';
  nextRoomId: string;
}[] => {
  if (!rayPath || !rayPath.segments || rayPath.segments.length === 0) {
    return [];
  }
  
  // Organize segments by roomId for quick access
  const segmentsByRoom = new Map<string, { start: Point, end: Point }[]>();
  
  rayPath.segments.forEach(segment => {
    if (segment.roomId === 'outside' || segment.roomId === originalRoomId) {
      return; // Skip outside and original room segments
    }
    
    if (!segmentsByRoom.has(segment.roomId)) {
      segmentsByRoom.set(segment.roomId, []);
    }
    segmentsByRoom.get(segment.roomId)?.push({ start: segment.start, end: segment.end });
  });
  
  // Get all virtual rooms
  const virtualRooms = rooms.filter(room => room.id !== originalRoomId);
  
  if (virtualRooms.length === 0) {
    return [];
  }
  
  // Find the room with the highest reflection order (furthest from original)
  const startRoom = virtualRooms.reduce((highest, current) => 
    current.reflectionOrder > highest.reflectionOrder ? current : highest, 
    virtualRooms[0]
  );
  
  // Build the path from start room back to original
  const sequence: { 
    roomId: string; 
    wall: 'top' | 'right' | 'bottom' | 'left';
    nextRoomId: string;
  }[] = [];
  
  // Set to track visited rooms to avoid cycles
  const visitedRooms = new Set<string>();
  let currentRoom = startRoom;
  
  while (currentRoom.id !== originalRoomId && !visitedRooms.has(currentRoom.id)) {
    visitedRooms.add(currentRoom.id);
    
    // Get segments in current room
    const segments = segmentsByRoom.get(currentRoom.id) || [];
    
    if (segments.length === 0) {
      // If no segments in this room, try to follow ancestry based on room ID
      const parts = currentRoom.id.split('-');
      if (parts.length >= 3) {
        // Room IDs follow pattern like "original-top-1" or "original-top-1-right-2"
        // The wall direction is the second-to-last element, like "top" or "right"
        const lastWall = parts[parts.length - 2] as 'top' | 'right' | 'bottom' | 'left';
        // Find the room on the other side of this wall
        const nextRoom = findRoomAfterWall(currentRoom, lastWall, rooms);
        
        if (nextRoom) {
          sequence.push({
            roomId: currentRoom.id,
            wall: lastWall,
            nextRoomId: nextRoom.id
          });
          
          currentRoom = nextRoom;
          continue;
        }
      }
      
      break; // No way to proceed further
    }
    
    // Analyze each segment to find its wall intersection
    for (const segment of segments) {
      const intersection = findSegmentWallIntersection(
        segment.start, 
        segment.end, 
        currentRoom, 
        roomSize
      );
      
      if (intersection.wall && intersection.intersectionPoint) {
        // Find the adjacent room across this wall
        const nextRoom = findRoomAfterWall(currentRoom, intersection.wall, rooms);
        
        if (nextRoom) {
    sequence.push({
            roomId: currentRoom.id,
            wall: intersection.wall,
            nextRoomId: nextRoom.id
          });
          
          currentRoom = nextRoom;
          break; // Move to next room
        }
      }
    }
    
    // If we didn't add a sequence step, we can't proceed further
    if (sequence.length === 0 || sequence[sequence.length - 1].roomId !== currentRoom.id) {
      break;
    }
  }
  
  return sequence;
};

/**
 * Calculate the progress of animation at a specific time
 */
export const getFoldProgress = (
  startTime: number,
  currentTime: number,
  duration: number
): number => {
  const elapsed = currentTime - startTime;
  return Math.min(1, Math.max(0, elapsed / duration));
};

/**
 * Calculate a transformation matrix for folding animation
 */
export const calculateFoldMatrix = (
  wall: 'top' | 'right' | 'bottom' | 'left',
  progress: number // 0 to 1
): string => {
  const { property, value } = getRotationForWall(wall);
  const angle = value * progress;
  
  return `${property}(${angle}deg)`;
};

/**
 * Reflects a point across a specified wall boundary
 * 
 * @param point The point to reflect
 * @param roomPosition The position of the room containing the point
 * @param roomSize The size of each room square
 * @param wall The wall to reflect across ('top', 'right', 'bottom', 'left')
 * @returns The reflected point
 */
export const reflectPointAcrossWall = (
  point: Point,
  roomPosition: Point,
  roomSize: number,
  wall: 'top' | 'right' | 'bottom' | 'left'
): Point => {
  // Calculate the wall position
  const roomLeft = roomPosition.x * roomSize;
  const roomRight = roomLeft + roomSize;
  const roomTop = roomPosition.y * roomSize;
  const roomBottom = roomTop + roomSize;
  
  // Perform reflection based on the wall
  // When folding toward the original room (0,0):
  // We're reflecting across the wall in the direction we want to fold
  switch (wall) {
    case 'top':
      // If we're below original (y > 0), fold up across top wall
      // Reflect across y = roomTop (horizontal axis at room's top edge)
      return { x: point.x, y: 2 * roomTop - point.y };
    
    case 'right':
      // If we're left of original (x < 0), fold right across right wall
      // Reflect across x = roomRight (vertical axis at room's right edge)
      return { x: 2 * roomRight - point.x, y: point.y };
    
    case 'bottom':
      // If we're above original (y < 0), fold down across bottom wall
      // Reflect across y = roomBottom (horizontal axis at room's bottom edge)
      return { x: point.x, y: 2 * roomBottom - point.y };
    
    case 'left':
      // If we're right of original (x > 0), fold left across left wall
      // Reflect across x = roomLeft (vertical axis at room's left edge)
      return { x: 2 * roomLeft - point.x, y: point.y };
    
    default:
      return point;
  }
};

/**
 * Determines if a point is "behind" a wall from the perspective of the room
 * 
 * @param point The point to check
 * @param roomPosition The position of the reference room
 * @param roomSize The size of each room
 * @param wall The wall to check against
 * @returns True if the point is behind the wall
 */
export const isPointBehindWall = (
  point: Point,
  roomPosition: Point,
  roomSize: number,
  wall: 'top' | 'right' | 'bottom' | 'left'
): boolean => {
  const roomLeft = roomPosition.x * roomSize;
  const roomRight = roomLeft + roomSize;
  const roomTop = roomPosition.y * roomSize;
  const roomBottom = roomTop + roomSize;
  
  // Note: The wall name indicates which wall of the current room we're folding ACROSS
  // When folding toward the original room (0,0):
  // - If we're above original and fold bottom, points above the bottom wall should be folded
  // - If we're below original and fold top, points below the top wall should be folded
  // - If we're right of original and fold left, points right of the left wall should be folded
  // - If we're left of original and fold right, points left of the right wall should be folded
  switch (wall) {
    case 'top':
      // When folding across top wall, fold points INSIDE the current room (not outside/above)
      return point.y >= roomTop && point.y <= roomBottom;
    
    case 'right':
      // When folding across right wall, fold points INSIDE the current room (not outside/right)
      return point.x >= roomLeft && point.x <= roomRight;
    
    case 'bottom':
      // When folding across bottom wall, fold points INSIDE the current room (not outside/below)
      return point.y >= roomTop && point.y <= roomBottom;
    
    case 'left':
      // When folding across left wall, fold points INSIDE the current room (not outside/left)
      return point.x >= roomLeft && point.x <= roomRight;
    
    default:
      return false;
  }
};

/**
 * Folds a ray path across a specific wall
 * 
 * @param rayPoints Array of points forming the ray path
 * @param roomPosition Position of the room to fold from
 * @param roomSize Size of each room
 * @param foldWall Wall to fold across
 * @returns Transformed ray points after folding
 */
export const foldRayPath = (
  rayPoints: Point[],
  roomPosition: Point, 
  roomSize: number,
  foldWall: 'top' | 'right' | 'bottom' | 'left'
): Point[] => {
  // Calculate room boundaries
  const roomLeft = roomPosition.x * roomSize;
  const roomRight = roomLeft + roomSize;
  const roomTop = roomPosition.y * roomSize;
  const roomBottom = roomTop + roomSize;
  
  // Define a more precise check for points inside the current room
  const isPointInRoom = (point: Point): boolean => {
    // Include points exactly on the room boundaries
    return (
      point.x >= roomLeft - 0.1 && point.x <= roomRight + 0.1 &&
      point.y >= roomTop - 0.1 && point.y <= roomBottom + 0.1
    );
  };
  
  // Determine the target direction we're trying to get to (towards original room at 0,0)
  const targetX = roomPosition.x > 0 ? -1 : roomPosition.x < 0 ? 1 : 0;
  const targetY = roomPosition.y > 0 ? -1 : roomPosition.y < 0 ? 1 : 0;
  
  // Check if a point is on the folding wall or in the room (improved boundary detection)
  const shouldFoldPoint = (point: Point): boolean => {
    // Always fold points that are in the current room moving toward the target direction
    if (isPointInRoom(point)) {
      switch (foldWall) {
        case 'top': return targetY < 0;
        case 'right': return targetX > 0;
        case 'bottom': return targetY > 0;
        case 'left': return targetX < 0;
      }
    }
    
    // Also fold points that are exactly on the boundary wall we're folding across
    // This is crucial for segments that form the boundary between rooms
    const isOnBoundary = (
      (foldWall === 'top' && Math.abs(point.y - roomTop) < 0.1) ||
      (foldWall === 'right' && Math.abs(point.x - roomRight) < 0.1) ||
      (foldWall === 'bottom' && Math.abs(point.y - roomBottom) < 0.1) ||
      (foldWall === 'left' && Math.abs(point.x - roomLeft) < 0.1)
    );
    
    if (isOnBoundary) {
      // For boundary points, check if they're in the direction we need to fold
      switch (foldWall) {
        case 'top': return point.y <= roomTop + 0.1;
        case 'right': return point.x >= roomRight - 0.1;
        case 'bottom': return point.y >= roomBottom - 0.1;
        case 'left': return point.x <= roomLeft + 0.1;
        default: return false;
      }
    }
    
    return false;
  };
  
  // For each point, check if it should be folded
  return rayPoints.map(point => {
    if (shouldFoldPoint(point)) {
      return reflectPointAcrossWall(point, roomPosition, roomSize, foldWall);
    }
    return { ...point }; // Return a copy of the original point
  });
};

/**
 * Generates a sequence of folding operations to transform a virtual room back to the original
 * 
 * @param startRoom The starting room for the folding sequence
 * @param endRoom The target room (usually the original room)
 * @returns An array of fold operations to perform
 */
export const generateFoldingSequence = (
  startRoom: Room,
  endRoom: Room
): { wall: 'top' | 'right' | 'bottom' | 'left', roomPosition: Point }[] => {
  const foldingSequence: { wall: 'top' | 'right' | 'bottom' | 'left', roomPosition: Point }[] = [];
  
  // Simple case: determine direction to original room
  let currentPosition = { ...startRoom.position };
  const targetPosition = { ...endRoom.position };
  
  // Keep folding until we reach the target position
  while (currentPosition.x !== targetPosition.x || currentPosition.y !== targetPosition.y) {
    // Determine which direction gets us closer to the target
    if (currentPosition.x > targetPosition.x) {
      // Need to fold left
      foldingSequence.push({ wall: 'left', roomPosition: { ...currentPosition } });
      currentPosition.x -= 1;
    } 
    else if (currentPosition.x < targetPosition.x) {
      // Need to fold right
      foldingSequence.push({ wall: 'right', roomPosition: { ...currentPosition } });
      currentPosition.x += 1;
    }
    else if (currentPosition.y > targetPosition.y) {
      // Need to fold up
      foldingSequence.push({ wall: 'top', roomPosition: { ...currentPosition } });
      currentPosition.y -= 1;
    }
    else if (currentPosition.y < targetPosition.y) {
      // Need to fold down
      foldingSequence.push({ wall: 'bottom', roomPosition: { ...currentPosition } });
      currentPosition.y += 1;
    }
    
    // Safety check to prevent infinite loop
    if (foldingSequence.length > 20) {
      console.error('Folding sequence too long, potential infinite loop');
      break;
    }
  }
  
  return foldingSequence;
};

/**
 * Extracts points from ray segments for folding operations
 * 
 * @param segments Array of ray segments
 * @returns Array of points including all start and end points
 */
export const extractPointsFromSegments = (
  segments: Array<{ start: Point, end: Point, roomId: string }>
): Point[] => {
  const points: Point[] = [];
  
  segments.forEach(segment => {
    points.push(segment.start);
    points.push(segment.end);
  });
  
  return points;
};

/**
 * Determines if a fold operation in a specific direction is valid
 * (i.e., if it brings us closer to the original room)
 * 
 * @param currentPosition Current room position
 * @param direction Direction to fold ('top', 'right', 'bottom', 'left')
 * @returns Whether the fold is valid
 */
export const isFoldValid = (
  currentPosition: Point,
  direction: 'top' | 'right' | 'bottom' | 'left'
): boolean => {
  switch (direction) {
    case 'top':
      return currentPosition.y > 0; // Can only fold up if we're below the original room
    
    case 'right':
      return currentPosition.x < 0; // Can only fold right if we're left of the original room
    
    case 'bottom':
      return currentPosition.y < 0; // Can only fold down if we're above the original room
    
    case 'left':
      return currentPosition.x > 0; // Can only fold left if we're right of the original room
    
    default:
      return false;
  }
};

/**
 * Helper function to apply folding transforms to a ray point
 */
export const applyFoldingToRayPoint = (
  point: Point
): Point => {
  // Simple implementation that returns the input point
  return { ...point };
};