import React, { useState, useEffect, useRef } from 'react';
import { FoldingState, Room, RayPath } from '../models/types';
import './VirtualRoomFolding.css';

interface VirtualRoomFoldingProps {
  foldingState: FoldingState;
  rayPath: RayPath | null;
  rooms: Room[];
  originalRoomId: string;
  roomRefs: Map<string, HTMLElement>;
  onFoldingComplete?: () => void;
  onFoldingReset?: () => void;
}

/**
 * Component that handles the folding animation between virtual rooms and the original room.
 * Uses CSS animations for room folding transformations.
 */
const VirtualRoomFolding: React.FC<VirtualRoomFoldingProps> = ({
  foldingState,
  rayPath,
  rooms,
  originalRoomId,
  roomRefs,
  onFoldingComplete,
  onFoldingReset
}) => {
  const [foldProgress, setFoldProgress] = useState(0);
  const [activeRoom, setActiveRoom] = useState<string | null>(null);
  const [raySvgRefs, setRaySvgRefs] = useState<React.ReactNode[]>([]);
  const animationRef = useRef<number | null>(null);
  const foldStartTimeRef = useRef<number | null>(null);
  const foldSequenceRef = useRef<string[]>([]);

  // Initialize or reset folding sequence when state changes
  useEffect(() => {
    if (foldingState === 'folding') {
      // Build the folding sequence - start with virtual rooms and trace back to original
      let sequence: string[] = [];
      if (rayPath && rayPath.roomsPassedThrough) {
        // Sort to ensure original room is folded last
        const sortedRooms = [...rayPath.roomsPassedThrough].sort((a, b) => {
          if (a === originalRoomId) return 1;
          if (b === originalRoomId) return -1;
          return 0;
        });
        sequence = sortedRooms;
      } else {
        // Fallback if no roomsPassedThrough - build from reflection points
        const reflectionRooms = new Set<string>();
        if (rayPath) {
          rayPath.reflectionPoints.forEach(rp => {
            const roomId = rp.wallId.split('-')[0];
            if (roomId !== originalRoomId) {
              reflectionRooms.add(roomId);
            }
          });
        }
        sequence = [...reflectionRooms, originalRoomId];
      }
      
      foldSequenceRef.current = sequence;
      setFoldProgress(0);
      setActiveRoom(sequence.length > 0 ? sequence[0] : null);
      
      // Create SVG elements for ray visualization during folding
      createFoldedRaySvgs();
      
      // Start animation
      foldStartTimeRef.current = performance.now();
      startFoldingAnimation();
    } else if (foldingState === 'unfolded') {
      // Reset all room transforms
      resetRoomTransforms();
      
      // Clear ray SVGs
      setRaySvgRefs([]);
      
      // Reset animation state
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      foldStartTimeRef.current = null;
      setFoldProgress(0);
      setActiveRoom(null);
      
      // Notify of reset completion
      if (onFoldingReset) {
        onFoldingReset();
      }
    }
    
    return () => {
      // Cancel animation on cleanup
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [foldingState, rayPath, originalRoomId, rooms, onFoldingComplete, onFoldingReset]);

  // Generate SVG elements for the ray path visualization during folding
  const createFoldedRaySvgs = () => {
    if (!rayPath || !rayPath.roomsPassedThrough) return;
    
    // For each room that the ray passes through, create a dedicated SVG
    const svgElements = rayPath.roomsPassedThrough.map((roomId, index) => {
      const room = rooms.find(r => r.id === roomId);
      if (!room) return null;
      
      // Filter ray points that belong to this room
      const roomPoints = filterRayPointsForRoom(rayPath, roomId);
      if (roomPoints.length < 2) return null;
      
      // Generate SVG with polyline for ray path
      return (
        <svg 
          key={`ray-${roomId}-${index}`}
          className="ray-path-svg"
          data-room-id={roomId}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            zIndex: 1000,
            opacity: foldingState === 'folding' ? 1 : 0,
            transition: 'opacity 0.3s ease'
          }}
        >
          <polyline
            points={roomPoints.map(p => `${p.x * (100 / room.width)}%,${p.y * (100 / room.height)}%`).join(' ')}
            stroke="#ff0000"
            strokeWidth={2}
            fill="none"
          />
          
          {/* Reflection points */}
          {rayPath.reflectionPoints
            .filter(rp => rp.wallId.startsWith(roomId))
            .map((rp, i) => (
              <circle
                key={i}
                cx={`${rp.point.x * (100 / room.width)}%`}
                cy={`${rp.point.y * (100 / room.height)}%`}
                r={4}
                fill="#ff0000"
              />
            ))
          }
        </svg>
      );
    }).filter(Boolean);
    
    setRaySvgRefs(svgElements as React.ReactNode[]);
  };
  
  // Filter ray points that belong to a specific room
  const filterRayPointsForRoom = (rayPath: RayPath, roomId: string): { x: number, y: number }[] => {
    // Logic to determine which ray segments belong to which rooms
    // This is a simplified approach - you might need more complex logic based on your ray data structure
    if (roomId === originalRoomId) {
      // For original room, include points connected to observer
      return rayPath.points.slice(-2);
    } else {
      // For virtual rooms, find reflection points in this room
      const reflectionIndices: number[] = [];
      
      rayPath.reflectionPoints.forEach((rp, index) => {
        if (rp.wallId.startsWith(roomId)) {
          reflectionIndices.push(index);
        }
      });
      
      if (reflectionIndices.length === 0) return [];
      
      // Get points around the reflection
      const minIndex = Math.min(...reflectionIndices);
      const maxIndex = Math.max(...reflectionIndices);
      
      // Return segment of points around these reflections
      return rayPath.points.slice(minIndex, maxIndex + 2);
    }
  };

  // Start the folding animation
  const startFoldingAnimation = () => {
    const animate = (timestamp: number) => {
      if (!foldStartTimeRef.current) {
        foldStartTimeRef.current = timestamp;
      }
      
      const elapsed = timestamp - foldStartTimeRef.current;
      const FOLD_DURATION = 1000; // ms per fold
      const progress = Math.min(elapsed / FOLD_DURATION, 1);
      
      setFoldProgress(progress);
      
      // If current fold is complete, move to next fold
      if (progress >= 1) {
        const currentIndex = foldSequenceRef.current.indexOf(activeRoom as string);
        if (currentIndex >= 0 && currentIndex < foldSequenceRef.current.length - 1) {
          // Move to next room in sequence
          const nextRoom = foldSequenceRef.current[currentIndex + 1];
          setActiveRoom(nextRoom);
          foldStartTimeRef.current = timestamp;
        } else {
          // Folding complete
          setFoldProgress(1);
          if (onFoldingComplete) {
            onFoldingComplete();
          }
          return;
        }
      }
      
      animationRef.current = requestAnimationFrame(animate);
    };
    
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    
    animationRef.current = requestAnimationFrame(animate);
  };
  
  // Apply CSS transforms to fold rooms
  useEffect(() => {
    if (foldingState !== 'folding' || !activeRoom) return;

    // Find all rooms that need to be folded
    const roomsToFold = rooms.filter(r => r.id !== originalRoomId);
    
    // Apply transforms based on folding progress
    roomsToFold.forEach(room => {
      const roomElement = roomRefs.get(room.id);
      if (!roomElement) return;
      
      // Only apply transition to active room
      if (room.id === activeRoom) {
        const angle = 90 * foldProgress; // Degrees
        
        // Apply transformation based on which wall the room is reflected across
        if (room.reflectionWall === 'top') {
          roomElement.style.transform = `rotateX(${angle}deg)`;
          roomElement.style.transformOrigin = 'top';
        } else if (room.reflectionWall === 'right') {
          roomElement.style.transform = `rotateY(${-angle}deg)`;
          roomElement.style.transformOrigin = 'right';
        } else if (room.reflectionWall === 'bottom') {
          roomElement.style.transform = `rotateX(${-angle}deg)`;
          roomElement.style.transformOrigin = 'bottom';
        } else if (room.reflectionWall === 'left') {
          roomElement.style.transform = `rotateY(${angle}deg)`;
          roomElement.style.transformOrigin = 'left';
        }
        
        roomElement.style.transition = `transform 0.2s ease`;
      } else {
        // If already folded (in sequence before activeRoom), keep it folded
        const roomIndex = foldSequenceRef.current.indexOf(room.id);
        const activeIndex = foldSequenceRef.current.indexOf(activeRoom);
        
        if (roomIndex < activeIndex) {
          // This room is already folded
          roomElement.style.transform = getFoldedTransform(room.reflectionWall);
          roomElement.style.transition = 'none';
        } else {
          // This room will be folded later, keep unfolded
          roomElement.style.transform = 'none';
          roomElement.style.transition = 'none';
        }
      }
    });
  }, [activeRoom, foldProgress, foldingState, originalRoomId, roomRefs, rooms]);

  // Get the transform string for a fully folded room
  const getFoldedTransform = (wall?: string) => {
    switch (wall) {
      case 'top': return 'rotateX(90deg)';
      case 'right': return 'rotateY(-90deg)';
      case 'bottom': return 'rotateX(-90deg)';
      case 'left': return 'rotateY(90deg)';
      default: return 'none';
    }
  };

  // Reset all room transforms to unfolded state
  const resetRoomTransforms = () => {
    rooms.forEach(room => {
      const roomElement = roomRefs.get(room.id);
      if (roomElement) {
        roomElement.style.transform = 'none';
        roomElement.style.transition = 'transform 0.5s ease';
      }
    });
  };

  return (
    <>
      {/* Ray path visualization elements that will be attached to each room */}
      {raySvgRefs}
    </>
  );
};

export default VirtualRoomFolding; 