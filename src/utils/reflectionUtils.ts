import { Room, PlacedObject, Point, Observer, RayPath } from '../models/types';
import { isPointInRoom, createVirtualRoom } from './roomUtils';

/**
 * Find the reflection path from original room to virtual room
 * Returns an array of {room, wall} pairs representing each reflection step
 */
export const getReflectionPath = (
  originalRoom: Room,
  virtualRoom: Room,
  allRooms: Room[] = []
): { room: Room; wall: 'top' | 'right' | 'bottom' | 'left' }[] => {
  if (originalRoom.id === virtualRoom.id) {
    return [];
  }
  
  // Build path backward from virtual to original
  const path: { room: Room; wall: 'top' | 'right' | 'bottom' | 'left' }[] = [];
  let currentRoom = virtualRoom;
  
  while (currentRoom.id !== originalRoom.id) {
    if (!currentRoom.parentRoomId || !currentRoom.reflectionWall) {
      console.warn('Incomplete room ancestry', currentRoom);
      break;
    }
    
    const parentRoom = allRooms.find(r => r.id === currentRoom.parentRoomId);
    if (!parentRoom) {
      console.warn('Could not find parent room', { roomId: currentRoom.parentRoomId, availableRooms: allRooms.map(r => r.id) });
      break;
    }
    
    // Add this reflection step
    path.push({ 
      room: parentRoom, 
      wall: currentRoom.reflectionWall 
    });
    
    currentRoom = parentRoom;
  }
  
  // Reverse for original to virtual order
  return path.reverse();
};

/**
 * Reflect a point across a wall according to mirror reflection rules
 * Simple flip across the axis defined by the wall
 */
export const reflectPointAcrossWall = (
  point: Point,
  room: Room,
  wall: 'top' | 'right' | 'bottom' | 'left'
): Point => {
  const { x, y } = point;
  const { width, height } = room;
  
  // Apply the correct reflection transformation based on the wall
  switch (wall) {
    case 'top':
      // Flip vertically across the top edge (y=0)
      return { x, y: -y };
    case 'right':
      // Flip horizontally across the right edge (x=width-1)
      return { x: 2 * width - x - 1, y };
    case 'bottom':
      // Flip vertically across the bottom edge (y=height-1)
      return { x, y: 2 * height - y - 1 };
    case 'left':
      // Flip horizontally across the left edge (x=0)
      return { x: -x, y };
    default:
      return { x, y };
  }
};

/**
 * Get the wall configuration for a virtual room
 * When reflecting across left/right walls, the top/bottom stays the same but left/right flips
 * When reflecting across top/bottom walls, the left/right stays the same but top/bottom flips
 */
export const getVirtualRoomWalls = (
  originalWalls: { top: boolean; right: boolean; bottom: boolean; left: boolean },
  reflectionWall: 'top' | 'right' | 'bottom' | 'left'
): { top: boolean; right: boolean; bottom: boolean; left: boolean } => {
  // Copy the original wall configuration
  const virtualWalls = { ...originalWalls };
  
  // Log for debugging
  console.log(`WALL CONFIG DEBUG: Original walls:`, originalWalls);
  console.log(`WALL CONFIG DEBUG: Reflecting across ${reflectionWall} wall`);
  
  // Apply the correct reflection transformation
  switch (reflectionWall) {
    case 'top':
      // When reflecting across top, flip top and bottom walls
      virtualWalls.top = originalWalls.bottom;
      virtualWalls.bottom = originalWalls.top;
      break;
    case 'bottom':
      // When reflecting across bottom, flip top and bottom walls
      virtualWalls.bottom = originalWalls.top;
      virtualWalls.top = originalWalls.bottom;
      break;
    case 'left':
      // When reflecting across left, flip left and right walls
      virtualWalls.left = originalWalls.right;
      virtualWalls.right = originalWalls.left;
      break;
    case 'right':
      // When reflecting across right, flip left and right walls
      virtualWalls.right = originalWalls.left;
      virtualWalls.left = originalWalls.right;
      break;
  }
  
  console.log(`WALL CONFIG DEBUG: Virtual walls:`, virtualWalls);
  return virtualWalls;
};

/**
 * Place virtual objects in virtual rooms using reflections
 * Simple and direct implementation that properly handles all reflection orders
 */
export const placeVirtualObjects = (
  objects: PlacedObject[],
  virtualRooms: Room[],
  originalRoom: Room
): PlacedObject[] => {
  const virtualObjects: PlacedObject[] = [];
  
  // Process only real objects
  const realObjects = objects.filter(obj => !obj.isVirtual);
  
  // For each virtual room
  for (const virtualRoom of virtualRooms) {
    // For each real object
    for (const realObject of realObjects) {
      try {
        // Create a unique ID for this virtual object
        const virtualObjectId = `virtual-${realObject.id}-in-${virtualRoom.id}`;
        
        // We need to reflect the object position across all walls in the reflection path
        // from original room to this virtual room
        
        // Start with the original object position
        let reflectedPosition = { ...realObject.position };
        
        if (virtualRoom.reflectionWall) {
          // For first-order reflections, this is straightforward
          if (virtualRoom.reflectionOrder === 1) {
            reflectedPosition = reflectObjectPosition(
              reflectedPosition,
              virtualRoom.width,
              virtualRoom.height,
              virtualRoom.reflectionWall
            );
          } else {
            // For higher-order reflections, we need to apply each reflection in sequence
            // This requires finding the path from original to virtual
            
            // Get the path of walls we reflected across to reach this room
            // This needs to be the full path from original to virtual room
            const reflectionPath = getReflectionPathWalls(virtualRoom, virtualRooms, originalRoom);
            
            // Apply each reflection in sequence
            for (const wall of reflectionPath) {
              reflectedPosition = reflectObjectPosition(
                reflectedPosition,
                originalRoom.width, // Use consistent dimensions for all rooms
                originalRoom.height,
                wall
              );
            }
          }
        }
        
        const virtualObject = {
          id: virtualObjectId,
          position: reflectedPosition,
          isVirtual: true,
          roomId: virtualRoom.id
        };
        
        virtualObjects.push(virtualObject);
      } catch (error) {
        console.error(`Failed to place virtual object in room ${virtualRoom.id}:`, error);
      }
    }
  }
  
  return virtualObjects;
};

/**
 * Reflect an object position across a specific wall
 */
function reflectObjectPosition(
  position: Point,
  roomWidth: number,
  roomHeight: number,
  wall: 'top' | 'right' | 'bottom' | 'left'
): Point {
  // Apply the basic reflection transformation
  switch (wall) {
    case 'top':
      // Reflect vertically across top wall - flip y coordinate
      return { x: position.x, y: roomHeight - position.y - 1 };
    case 'right':
      // Reflect horizontally across right wall - flip x coordinate
      return { x: roomWidth - position.x - 1, y: position.y };
    case 'bottom':
      // Reflect vertically across bottom wall - flip y coordinate
      return { x: position.x, y: roomHeight - position.y - 1 };
    case 'left':
      // Reflect horizontally across left wall - flip x coordinate
      return { x: roomWidth - position.x - 1, y: position.y };
    default:
      return { ...position };
  }
}

/**
 * Get the sequence of walls that were reflected across to reach the virtual room
 * Returns an array of wall identifiers in order from original to virtual
 */
function getReflectionPathWalls(
  virtualRoom: Room,
  allRooms: Room[],
  originalRoom: Room
): ('top' | 'right' | 'bottom' | 'left')[] {
  const walls: ('top' | 'right' | 'bottom' | 'left')[] = [];
  let currentRoom = virtualRoom;
  
  // Work backwards from virtual room to original
  while (currentRoom.id !== originalRoom.id) {
    if (!currentRoom.reflectionWall || !currentRoom.parentRoomId) {
      console.warn('Incomplete room data for reflection path', currentRoom);
      break;
    }
    
    // Add this reflection wall
    walls.unshift(currentRoom.reflectionWall);
    
    // Move to parent room
    const parentRoom = allRooms.find(r => r.id === currentRoom.parentRoomId);
    if (!parentRoom) {
      console.warn('Could not find parent room', { roomId: currentRoom.parentRoomId });
      break;
    }
    
    currentRoom = parentRoom;
  }
  
  return walls;
}

/**
 * Calculate intersection point of a line with a wall
 */
export const calculateIntersection = (
  start: Point,
  end: Point,
  room: Room,
  wall: 'top' | 'right' | 'bottom' | 'left'
): Point | null => {
  const { position, width, height } = room;
  const m = (end.y - start.y) / (end.x - start.x); // Slope
  
  switch (wall) {
    case 'top': {
      // y = position.y
      const wallY = position.y;
      if ((start.y - wallY) * (end.y - wallY) > 0) return null; // No intersection
      
      const x = start.x + (wallY - start.y) / m;
      if (x >= position.x && x <= position.x + width) {
        return { x, y: wallY };
      }
      return null;
    }
    case 'right': {
      // x = position.x + width
      const wallX = position.x + width;
      if ((start.x - wallX) * (end.x - wallX) > 0) return null; // No intersection
      
      const y = start.y + m * (wallX - start.x);
      if (y >= position.y && y <= position.y + height) {
        return { x: wallX, y };
      }
      return null;
    }
    case 'bottom': {
      // y = position.y + height
      const wallY = position.y + height;
      if ((start.y - wallY) * (end.y - wallY) > 0) return null; // No intersection
      
      const x = start.x + (wallY - start.y) / m;
      if (x >= position.x && x <= position.x + width) {
        return { x, y: wallY };
      }
      return null;
    }
    case 'left': {
      // x = position.x
      const wallX = position.x;
      if ((start.x - wallX) * (end.x - wallX) > 0) return null; // No intersection
      
      const y = start.y + m * (wallX - start.x);
      if (y >= position.y && y <= position.y + height) {
        return { x: wallX, y };
      }
      return null;
    }
    default:
      return null;
  }
};

/**
 * Check if a ray path is valid by verifying all reflections occur at mirrored walls
 */
export const isValidRayPath = (
  rayPath: RayPath,
  rooms: Room[]
): boolean => {
  // Check each segment of the path
  if (!rayPath.reflectionPoints || rayPath.reflectionPoints.length === 0) {
    return true; // No reflection points means it's a direct path
  }
  
  for (let i = 0; i < rayPath.reflectionPoints.length; i++) {
    const reflection = rayPath.reflectionPoints[i];
    const [roomId, wall] = reflection.wallId.split('-');
    
    // Find the room for this reflection
    const room = rooms.find(r => r.id === roomId);
    if (!room) return false;
    
    // Check if the wall is mirrored
    if (!room.walls[wall as 'top' | 'right' | 'bottom' | 'left']) {
      return false;
    }
  }
  
  return true;
};

/**
 * Trace a ray from a virtual object to the observer
 */
export const traceRayFromVirtualToReal = (
  virtualObject: PlacedObject,
  observer: Observer,
  rooms: Room[],
  originalRoom: Room
): RayPath | null => {
  // Find the virtual room this object belongs to
  const virtualRoom = rooms.find(r => r.id === virtualObject.roomId);
  if (!virtualRoom) return null;
  
  // Direct line from virtual object to observer
  const directRay: RayPath = {
    points: [virtualObject.position, observer.position],
    segments: [],
    reflectionPoints: [],
    isVisible: true,
    virtualObjectId: virtualObject.id
  };
  
  // If the object is in the original room, or the observer is in the virtual room,
  // then the ray is already valid
  if (virtualRoom.id === originalRoom.id || isPointInRoom(observer.position, virtualRoom)) {
    return directRay;
  }
  
  // Otherwise, compute the reflection points
  const rayPath = computeReflectionPath(
    virtualObject.position,
    observer.position,
    virtualRoom,
    originalRoom,
    rooms
  );
  
  if (!rayPath || !isValidRayPath(rayPath, rooms)) {
    return null;
  }
  
  return rayPath;
};

/**
 * Compute the reflection path from a point in a virtual room to a point in the original room
 */
const computeReflectionPath = (
  start: Point,
  end: Point,
  startRoom: Room,
  endRoom: Room,
  allRooms: Room[]
): RayPath | null => {
  // Simplified implementation - find the direct path back through parent rooms
  
  let currentRoom = startRoom;
  let currentPoint = start;
  const points: Point[] = [start];
  const reflectionPoints: { point: Point; wallId: string }[] = [];
  
  while (currentRoom.id !== endRoom.id) {
    if (!currentRoom.parentRoomId || !currentRoom.reflectionWall) {
      return null; // Cannot trace back
    }
    
    const parentRoom = allRooms.find(r => r.id === currentRoom.parentRoomId);
    if (!parentRoom) return null;
    
    // Find intersection with the reflection wall
    const intersection = calculateIntersection(
      currentPoint,
      end,
      currentRoom,
      currentRoom.reflectionWall
    );
    
    if (!intersection) return null;
    
    // Add the reflection point
    points.push(intersection);
    reflectionPoints.push({
      point: intersection,
      wallId: `${parentRoom.id}-${currentRoom.reflectionWall}`
    });
    
    // Move to the parent room
    currentRoom = parentRoom;
    currentPoint = intersection;
  }
  
  // Add the end point
  points.push(end);
  
  return {
    points,
    segments: [],
    reflectionPoints,
    isVisible: true,
    virtualObjectId: ''  // This should be set by the caller
  };
};

/**
 * Flip wall configuration when creating a virtual room
 * For example, a top mirror becomes a bottom mirror in a room
 * reflected across the top wall.
 */
export const getFlippedWallConfig = (
  originalWalls: { top: boolean; right: boolean; bottom: boolean; left: boolean },
  reflectionWall: 'top' | 'right' | 'bottom' | 'left'
): { top: boolean; right: boolean; bottom: boolean; left: boolean } => {
  const flippedWalls = { ...originalWalls };
  
  switch (reflectionWall) {
    case 'top':
    case 'bottom':
      // When reflecting across top or bottom, flip top and bottom mirrors
      flippedWalls.top = originalWalls.bottom;
      flippedWalls.bottom = originalWalls.top;
      break;
    case 'left':
    case 'right':
      // When reflecting across left or right, flip left and right mirrors
      flippedWalls.left = originalWalls.right;
      flippedWalls.right = originalWalls.left;
      break;
  }
  
  return flippedWalls;
};

/**
 * TEST FUNCTION - DO NOT USE IN PRODUCTION
 * This function tests reflection transformations for a simple room setup with multiple reflections
 */
export const testReflectionTransformations = () => {
  console.log("========== REFLECTION TRANSFORMATION TEST ==========");
  
  // Create a simple room setup - original room at (0,0) with specific mirror configuration
  // Mirrors on top, left, and right but not bottom
  const originalRoom: Room = {
    id: 'original',
    width: 4,
    height: 4,
    walls: { top: true, right: true, bottom: false, left: true },
    position: { x: 0, y: 0 },
    reflectionOrder: 0
  };
  
  console.log("\n--- ORIGINAL ROOM ---");
  console.log("Original room walls:", originalRoom.walls);
  
  // ===== FIRST ORDER REFLECTIONS =====
  console.log("\n=== FIRST ORDER REFLECTIONS ===");
  
  // Top virtual room (reflection across top wall)
  const topRoom = createVirtualRoom(
    originalRoom,
    'top',
    { x: 0, y: -1 },
    1
  );
  console.log(`Top virtual room (${topRoom.position.x}, ${topRoom.position.y}):`);
  console.log("  ID:", topRoom.id);
  console.log("  Walls:", topRoom.walls);
  
  // Right virtual room (reflection across right wall)
  const rightRoom = createVirtualRoom(
    originalRoom,
    'right',
    { x: 1, y: 0 },
    1
  );
  console.log(`Right virtual room (${rightRoom.position.x}, ${rightRoom.position.y}):`);
  console.log("  ID:", rightRoom.id);
  console.log("  Walls:", rightRoom.walls);
  
  // Left virtual room (reflection across left wall)
  const leftRoom = createVirtualRoom(
    originalRoom,
    'left',
    { x: -1, y: 0 },
    1
  );
  console.log(`Left virtual room (${leftRoom.position.x}, ${leftRoom.position.y}):`);
  console.log("  ID:", leftRoom.id);
  console.log("  Walls:", leftRoom.walls);
  
  const firstOrderRooms = [topRoom, rightRoom, leftRoom];
  
  // ===== SECOND ORDER REFLECTIONS =====
  console.log("\n=== SECOND ORDER REFLECTIONS ===");
  const secondOrderRooms: Room[] = [];
  
  // Top-right room (reflection of top room across right wall)
  if (topRoom.walls.right) {
    const topRightRoom = createVirtualRoom(
      topRoom,
      'right',
      { x: 1, y: -1 },
      2
    );
    console.log(`Top-right virtual room (${topRightRoom.position.x}, ${topRightRoom.position.y}):`);
    console.log("  ID:", topRightRoom.id);
    console.log("  Walls:", topRightRoom.walls);
    secondOrderRooms.push(topRightRoom);
  }
  
  // Top-left room (reflection of top room across left wall)
  if (topRoom.walls.left) {
    const topLeftRoom = createVirtualRoom(
      topRoom,
      'left',
      { x: -1, y: -1 },
      2
    );
    console.log(`Top-left virtual room (${topLeftRoom.position.x}, ${topLeftRoom.position.y}):`);
    console.log("  ID:", topLeftRoom.id);
    console.log("  Walls:", topLeftRoom.walls);
    secondOrderRooms.push(topLeftRoom);
  }
  
  // Right-top room (reflection of right room across top wall)
  if (rightRoom.walls.top) {
    const rightTopRoom = createVirtualRoom(
      rightRoom,
      'top',
      { x: 1, y: -1 },
      2
    );
    console.log(`Right-top virtual room (${rightTopRoom.position.x}, ${rightTopRoom.position.y}):`);
    console.log("  ID:", rightTopRoom.id);
    console.log("  Walls:", rightTopRoom.walls);
    secondOrderRooms.push(rightTopRoom);
  }
  
  // Left-top room (reflection of left room across top wall)
  if (leftRoom.walls.top) {
    const leftTopRoom = createVirtualRoom(
      leftRoom,
      'top',
      { x: -1, y: -1 },
      2
    );
    console.log(`Left-top virtual room (${leftTopRoom.position.x}, ${leftTopRoom.position.y}):`);
    console.log("  ID:", leftTopRoom.id);
    console.log("  Walls:", leftTopRoom.walls);
    secondOrderRooms.push(leftTopRoom);
  }
  
  // ===== PLACE TEST OBJECT =====
  console.log("\n=== OBJECT PLACEMENT TEST ===");
  const testObject: PlacedObject = {
    id: 'test-object',
    position: { x: 2, y: 1 },
    isVirtual: false,
    roomId: originalRoom.id
  };
  
  console.log("Original object:", testObject.position);
  
  // Place in first order rooms
  const firstOrderObjects = placeVirtualObjects([testObject], firstOrderRooms, originalRoom);
  firstOrderObjects.forEach(obj => {
    const room = firstOrderRooms.find(r => r.id === obj.roomId);
    console.log(`Virtual object in ${room?.reflectionWall} room: (${obj.position.x}, ${obj.position.y})`);
  });
  
  // Place in second order rooms
  const secondOrderObjects = placeVirtualObjects([testObject], secondOrderRooms, originalRoom);
  secondOrderObjects.forEach(obj => {
    const room = secondOrderRooms.find(r => r.id === obj.roomId);
    if (room) {
      const parentRoom = firstOrderRooms.find(r => r.id === room.parentRoomId);
      console.log(`Virtual object in ${parentRoom?.reflectionWall}-${room.reflectionWall} room: (${obj.position.x}, ${obj.position.y})`);
    }
  });
  
  console.log("\n=== TEST COMPLETE ===");
  
  // Return all rooms for reference
  return {
    originalRoom,
    firstOrderRooms,
    secondOrderRooms,
    allVirtualRooms: [...firstOrderRooms, ...secondOrderRooms]
  };
};