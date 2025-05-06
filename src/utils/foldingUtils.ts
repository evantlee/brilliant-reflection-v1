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