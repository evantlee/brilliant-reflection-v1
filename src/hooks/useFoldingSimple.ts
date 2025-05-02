import { useState, useRef, useEffect } from 'react';
import { Room, RayPath, FoldingState } from '../models/types';
import { 
  calculateTransformOrigin, 
  getRotationForWall, 
  getFoldingSequence 
} from '../utils/foldingUtils';

interface UseFoldingSimpleOptions {
  duration?: number;
  delay?: number;
}

export const useFoldingSimple = (
  rayPath: RayPath | null,
  rooms: Room[],
  originalRoomId: string,
  options: UseFoldingSimpleOptions = {}
) => {
  const { 
    duration = 1000, 
    delay = 500 
  } = options;
  
  // Folding state
  const [foldingState, setFoldingState] = useState<FoldingState>('unfolded');
  
  // References to room DOM elements
  const roomRefs = useRef<Map<string, HTMLElement>>(new Map());
  
  // Folding sequence
  const [foldingSequence, setFoldingSequence] = useState<{
    room: Room;
    wall: 'top' | 'right' | 'bottom' | 'left';
  }[]>([]);
  
  // Track if animation is in progress
  const animationInProgressRef = useRef<boolean>(false);
  
  // Update folding sequence when ray path changes
  useEffect(() => {
    if (rayPath) {
      const sequence = getFoldingSequence(rayPath, rooms, originalRoomId);
      setFoldingSequence(sequence);
    } else {
      setFoldingSequence([]);
    }
  }, [rayPath, rooms, originalRoomId]);
  
  // Register a room element
  const registerRoomRef = (roomId: string, element: HTMLElement | null) => {
    if (element) {
      roomRefs.current.set(roomId, element);
    } else {
      roomRefs.current.delete(roomId);
    }
  };
  
  // Set up CSS properties for an element
  const setElementStyle = (
    element: HTMLElement, 
    properties: Record<string, string>
  ) => {
    Object.entries(properties).forEach(([key, value]) => {
      element.style[key as any] = value;
    });
  };
  
  // Start folding animation
  const startFolding = () => {
    if (!rayPath || foldingSequence.length === 0 || foldingState !== 'unfolded' || animationInProgressRef.current) {
      return;
    }
    
    setFoldingState('folding');
    animationInProgressRef.current = true;
    
    // Function to process each step in sequence
    const processStep = (index: number) => {
      if (index >= foldingSequence.length) {
        setFoldingState('folded');
        animationInProgressRef.current = false;
        return;
      }
      
      const { room, wall } = foldingSequence[index];
      const element = roomRefs.current.get(room.id);
      
      if (!element) {
        processStep(index + 1);
        return;
      }
      
      const transformOrigin = calculateTransformOrigin(room, wall);
      const { property, value } = getRotationForWall(wall);
      
      // Set up transition
      setElementStyle(element, {
        'transition': `transform ${duration}ms ease-out`,
        'transform-origin': transformOrigin
      });
      
      // Apply transform after a brief delay (for transition to take effect)
      setTimeout(() => {
        setElementStyle(element, {
          'transform': `${property}(${value}deg)`
        });
        
        // Wait for transition to complete
        setTimeout(() => {
          processStep(index + 1);
        }, duration + 50); // Add a small buffer
      }, index === 0 ? delay : 50);
    };
    
    // Start processing sequence
    processStep(0);
  };
  
  // Reset folding animation
  const resetFolding = () => {
    if (foldingState === 'unfolded' || animationInProgressRef.current) return;
    
    animationInProgressRef.current = true;
    
    // Reset all room transforms
    roomRefs.current.forEach((element) => {
      setElementStyle(element, {
        'transition': 'transform 500ms ease-out',
        'transform-origin': '50% 50%',
        'transform': 'rotateX(0deg) rotateY(0deg)'
      });
    });
    
    // Wait for transitions to complete
    setTimeout(() => {
      setFoldingState('unfolded');
      animationInProgressRef.current = false;
    }, 550); // Slightly longer than transition duration
  };
  
  return {
    foldingState,
    registerRoomRef,
    startFolding,
    resetFolding
  };
};

export default useFoldingSimple;