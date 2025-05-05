import { Room, Point, RoomNode } from '../models/types';
import { getVirtualRoomWalls } from './reflectionUtils';

/**
 * Generate a unique ID for a room
 * Using a path-based ID approach as requested
 */
export const generateRoomId = (
  parentId: string,
  reflectionWall: 'top' | 'right' | 'bottom' | 'left',
  reflectionOrder: number
): string => {
  // Create a unique path-based ID
  return `${parentId}-${reflectionWall}-${reflectionOrder}`;
};

/**
 * Create a virtual room based on a reflection of a source room
 */
export const createVirtualRoom = (
  sourceRoom: Room,
  reflectionWall: 'top' | 'right' | 'bottom' | 'left',
  position: Point,
  reflectionOrder: number
): Room => {
  return {
    id: generateRoomId(sourceRoom.id, reflectionWall, reflectionOrder),
    width: sourceRoom.width,
    height: sourceRoom.height,
    walls: getVirtualRoomWalls(sourceRoom.walls, reflectionWall),
    position,
    reflectionOrder,
    reflectionWall,
    parentRoomId: sourceRoom.id
  };
};

/**
 * Generates the position for a virtual room based on reflection wall
 */
export const getVirtualRoomPosition = (
  sourceRoom: Room,
  reflectionWall: 'top' | 'right' | 'bottom' | 'left'
): Point => {
  const { x, y } = sourceRoom.position;
  switch (reflectionWall) {
    case 'top':
      return { x, y: y - 1 };
    case 'right':
      return { x: x + 1, y };
    case 'bottom':
      return { x, y: y + 1 };
    case 'left':
      return { x: x - 1, y };
  }
};

/**
 * Generate all virtual rooms up to a given reflection order
 */
export const generateVirtualRooms = (
  originalRoom: Room,
  maxOrder: number = 1
): Room[] => {
  if (maxOrder <= 0) return [];
  
  // Create room node tree
  const rootNode: RoomNode = {
    room: originalRoom,
    children: [],
    parent: null
  };
  
  // Track created rooms by ID to avoid duplicates
  const roomsById = new Map<string, RoomNode>();
  roomsById.set(originalRoom.id, rootNode);
  
  // Recursively build the room tree
  buildRoomTree(rootNode, maxOrder, roomsById);
  
  // Flatten tree into array of rooms
  const virtualRooms = flattenRoomTree(rootNode).filter(room => room.id !== originalRoom.id);
  
  console.log(`Generated ${virtualRooms.length} virtual rooms after filtering out overlaps`);
  
  return virtualRooms;
};

/**
 * Recursively build the room tree up to maxOrder reflections
 */
const buildRoomTree = (
  node: RoomNode,
  maxOrder: number,
  roomsById: Map<string, RoomNode>,
  currentOrder: number = 0
): void => {
  if (currentOrder >= maxOrder) return;
  
  const { room } = node;
  
  console.log(`ROOM TREE DEBUG: Processing room ${room.id} at order ${currentOrder}, position (${room.position.x}, ${room.position.y})`);
  console.log(`ROOM TREE DEBUG: Room walls: top=${room.walls.top}, right=${room.walls.right}, bottom=${room.walls.bottom}, left=${room.walls.left}`);
  
  // Helper to create a virtual room if the source room has a mirror on the given wall
  const createVirtualRoomIfNeeded = (wall: 'top' | 'right' | 'bottom' | 'left') => {
    if (!room.walls[wall]) {
      console.log(`ROOM TREE DEBUG: Room ${room.id} does not have ${wall} mirror`);
      return;
    }
    
    console.log(`ROOM TREE DEBUG: Room ${room.id} has ${wall} mirror, creating virtual room`);
    console.log(`ROOM TREE DEBUG: Checking ${wall} wall for room ${room.id}`);
    
    // Calculate the position for the new virtual room
    const position = getVirtualRoomPosition(room, wall);
    
    // Create a virtual room
    const virtualRoom = createVirtualRoom(room, wall, position, currentOrder + 1);
    
    // Check if we've already created this room
    if (roomsById.has(virtualRoom.id)) {
      console.log(`ROOM TREE DEBUG: Room with ID ${virtualRoom.id} already exists, skipping`);
      return;
    }
    
    // Find any rooms at the same position
    const roomsAtPosition = Array.from(roomsById.values()).filter(existingNode => 
      existingNode.room.position.x === position.x && 
      existingNode.room.position.y === position.y
    );
    
    // Skip if this would create a room at the position of the original room
    // (except for direct reflections from the original room)
    if (position.x === 0 && position.y === 0 && currentOrder > 0) {
      console.log(`ROOM TREE DEBUG: Would create room at original position (0,0), skipping`);
      return;
    }
    
    // Skip if there's a room at this position with lower reflection order
    if (roomsAtPosition.length > 0) {
      const lowestOrderRoom = roomsAtPosition.reduce((lowest, current) => 
        (current.room.reflectionOrder < lowest.room.reflectionOrder) ? current : lowest, 
        roomsAtPosition[0]
      );
      
      if (currentOrder + 1 > lowestOrderRoom.room.reflectionOrder) {
        console.log(`ROOM TREE DEBUG: Position (${position.x}, ${position.y}) already has a lower order room ${lowestOrderRoom.room.id}, skipping`);
        return;
      }
    }
    
    console.log(`ROOM TREE DEBUG: Creating new virtual room at position (${position.x}, ${position.y}) via ${wall} reflection`);
    
    // Create a new node for this virtual room
    const childNode: RoomNode = {
      room: virtualRoom,
      children: [],
      parent: node
    };
    
    // Add to the tree and tracking map
    node.children.push(childNode);
    roomsById.set(virtualRoom.id, childNode);
    
    // Continue building the tree from this node
    buildRoomTree(childNode, maxOrder, roomsById, currentOrder + 1);
  };
  
  // Try to create a virtual room for each wall
  createVirtualRoomIfNeeded('top');
  createVirtualRoomIfNeeded('right');
  createVirtualRoomIfNeeded('bottom');
  createVirtualRoomIfNeeded('left');
};

/**
 * Flatten a room tree into an array of rooms
 */
export const flattenRoomTree = (root: RoomNode): Room[] => {
  const rooms: Room[] = [root.room];
  
  for (const child of root.children) {
    rooms.push(...flattenRoomTree(child));
  }
  
  return rooms;
};

/**
 * Find the path from a virtual room back to the original room
 */
export const findPathToOriginal = (
  virtualRoom: Room,
  allRooms: Room[]
): Room[] => {
  const path: Room[] = [virtualRoom];
  let currentRoom = virtualRoom;
  
  while (currentRoom.parentRoomId) {
    const parentRoom = allRooms.find(room => room.id === currentRoom.parentRoomId);
    if (!parentRoom) break;
    
    path.push(parentRoom);
    currentRoom = parentRoom;
  }
  
  return path.reverse();
};

/**
 * Check if a point is inside a room
 */
export const isPointInRoom = (point: Point, room: Room): boolean => {
  const { x, y } = point;
  const { position, width, height } = room;
  
  return (
    x >= position.x && 
    x < position.x + width && 
    y >= position.y && 
    y < position.y + height
  );
};