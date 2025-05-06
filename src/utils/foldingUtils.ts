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
 * Determine if a ray passes through a specific wall of a room
 */
export const doesRayPassThroughWall = (
  rayPath: RayPath,
  roomId: string,
  wall: 'top' | 'right' | 'bottom' | 'left'
): boolean => {
  return rayPath.reflectionPoints?.some(
    (point: { wallId: string }) => point.wallId === `${roomId}-${wall}`
  ) || false;
};

/**
 * Get a sequence of rooms to fold based on a ray path
 */
export const getFoldingSequence = (
  rayPath: RayPath,
  rooms: Room[]
): { room: Room; wall: 'top' | 'right' | 'bottom' | 'left' }[] => {
  const sequence: { room: Room; wall: 'top' | 'right' | 'bottom' | 'left' }[] = [];
  
  // Extract room IDs and walls from reflection points
  if (rayPath.reflectionPoints) {
    for (const reflection of rayPath.reflectionPoints) {
      const [roomId, wall] = reflection.wallId.split('-');
      
      // Find the room
      const room = rooms.find(r => r.id === roomId);
      if (!room) continue;
      
      // Add to sequence
      sequence.push({
        room,
        wall: wall as 'top' | 'right' | 'bottom' | 'left'
      });
    }
  }
  
  return sequence;
};

/**
 * Update ray path points during folding animation
 */
export const updateRayPathDuringFolding = (
  rayPath: RayPath
): Point[] => {
  // This is a placeholder for more complex folding path calculation
  // In a real implementation, this would apply rotational transforms to the ray points
  return rayPath.points || [];
};

/**
 * Get the fold progress at a specific timestamp
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
 * Calculate a transformation matrix for folding a room
 */
export const calculateFoldMatrix = (
  wall: 'top' | 'right' | 'bottom' | 'left',
  progress: number // 0 to 1
): string => {
  const { property, value } = getRotationForWall(wall);
  const angle = value * progress;
  
  return `${property}(${angle}deg)`;
};