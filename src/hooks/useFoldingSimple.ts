import { useState, useRef, useEffect, useMemo } from 'react';
import { Room, RayPath, FoldingState, Point } from '../models/types';
import { 
  calculateTransformOrigin, 
  getRotationForWall, 
  getFoldingSequence,
  reflectPointOverWall,
  getFoldProgress
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
  
  // Current folding step
  const [currentFoldingStep, setCurrentFoldingStep] = useState<number>(0);
  
  // References to room DOM elements
  const roomRefs = useRef<Map<string, HTMLElement>>(new Map());
  
  // Room size for calculations (default to 300 if not provided)
  const roomSize = 300;
  
  // Memoize the folding sequence calculation
  const foldingSequence = useMemo(() => {
    if (rayPath) {
      return getFoldingSequence(rayPath, rooms, originalRoomId, roomSize);
    }
    return [];
  }, [rayPath, rooms, originalRoomId, roomSize]);
  
  // Track if animation is in progress
  const animationInProgressRef = useRef<boolean>(false);
  
  // Track transformed ray segments during folding
  const [transformedRayPoints, setTransformedRayPoints] = useState<Point[]>([]);
  
  // Original segments by room ID for quick lookup
  const segmentsByRoomId = useMemo(() => {
    if (!rayPath || !rayPath.segments) return new Map();
    
    const map = new Map<string, { start: Point, end: Point }[]>();
    
    rayPath.segments.forEach(segment => {
      if (!map.has(segment.roomId)) {
        map.set(segment.roomId, []);
      }
      map.get(segment.roomId)?.push({ start: segment.start, end: segment.end });
    });
    
    return map;
  }, [rayPath]);
  
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
  
  // Calculate transformed points for a specific folding step and progress
  const calculateTransformedPoints = (
    currentStep: number,
    progress: number
  ): Point[] => {
    if (!rayPath || !foldingSequence.length || currentStep >= foldingSequence.length) {
      return [];
    }
    
    // Make a copy of the original segments to work with
    const allSegments = rayPath.segments.map(segment => ({
      start: { ...segment.start },
      end: { ...segment.end },
      roomId: segment.roomId
    }));
    
    // Current folding step data
    const currentFoldData = foldingSequence[currentStep];
    
    // Find segments that need transformation and those that don't
    const segmentsToTransform = [];
    const segmentsToKeepUnchanged = [];
    
    for (const segment of allSegments) {
      // Original room segments and outside segments never transform
      if (segment.roomId === originalRoomId || segment.roomId === 'outside') {
        segmentsToKeepUnchanged.push(segment);
        continue;
      }
      
      // For current step, see if this segment is in the room we're currently folding
      // or it's in a room that hasn't been processed yet in the sequence
      const roomIndex = foldingSequence.findIndex(step => step.roomId === segment.roomId);
      const roomNotProcessedYet = roomIndex > currentStep || roomIndex === -1;
      
      if (roomNotProcessedYet) {
        segmentsToKeepUnchanged.push(segment);
        continue;
      }
      
      // This segment needs transformation
      segmentsToTransform.push(segment);
    }
    
    // Collect all points for output
    const points: Point[] = [];
    
    // Add unchanged segments first
    for (const segment of segmentsToKeepUnchanged) {
      points.push(segment.start, segment.end);
    }
    
    // Now handle transformations for segments that need it
    for (const segment of segmentsToTransform) {
      // Find where this segment's room first appears in the sequence
      const roomFirstIndex = foldingSequence.findIndex(step => step.roomId === segment.roomId);
      
      // Apply transformations from all completed previous steps
      let transformedStart = { ...segment.start };
      let transformedEnd = { ...segment.end };
      
      // Apply all previously completed transformations
      for (let i = roomFirstIndex; i < currentStep; i++) {
        const { wall } = foldingSequence[i];
        const room = rooms.find(r => r.id === foldingSequence[i].roomId);
        
        if (!room) continue;
        
        transformedStart = reflectPointOverWall(transformedStart, wall, room.position, roomSize);
        transformedEnd = reflectPointOverWall(transformedEnd, wall, room.position, roomSize);
      }
      
      // Apply current transformation with progress
      if (roomFirstIndex <= currentStep) {
        const { wall } = foldingSequence[currentStep];
        const room = rooms.find(r => r.id === foldingSequence[currentStep].roomId);
        
        if (room) {
          // Calculate final transformed positions
          const finalStart = reflectPointOverWall(transformedStart, wall, room.position, roomSize);
          const finalEnd = reflectPointOverWall(transformedEnd, wall, room.position, roomSize);
          
          // Apply partial transformation based on progress
          const currentStart = {
            x: transformedStart.x + (finalStart.x - transformedStart.x) * progress,
            y: transformedStart.y + (finalStart.y - transformedStart.y) * progress
          };
          
          const currentEnd = {
            x: transformedEnd.x + (finalEnd.x - transformedEnd.x) * progress,
            y: transformedEnd.y + (finalEnd.y - transformedEnd.y) * progress
          };
          
          points.push(currentStart, currentEnd);
        } else {
          points.push(transformedStart, transformedEnd);
        }
      } else {
        points.push(transformedStart, transformedEnd);
      }
    }
    
    return points;
  };
  
  // Start folding animation
  const startFolding = () => {
    if (!rayPath || foldingSequence.length === 0 || foldingState !== 'unfolded' || animationInProgressRef.current) {
      return;
    }
    
    setFoldingState('folding');
    setCurrentFoldingStep(0);
    animationInProgressRef.current = true;
    
    // Initialize transformed ray segments with current state
    setTransformedRayPoints(
      calculateTransformedPoints(0, 0) // Start with progress = 0
    );
    
    // Function to process each step in sequence
    const processStep = (index: number) => {
      if (index >= foldingSequence.length) {
        setFoldingState('folded');
        animationInProgressRef.current = false;
        return;
      }
      
      setCurrentFoldingStep(index);
      
      // Animate the ray path transformation
      const startTime = Date.now();
      
      const animateRayPath = () => {
        const currentTime = Date.now();
        const progress = getFoldProgress(startTime, currentTime, duration);
        
        // Update transformed ray points based on current progress
        setTransformedRayPoints(
          calculateTransformedPoints(index, progress)
        );
        
        // Continue animation until complete
        if (progress < 1) {
          requestAnimationFrame(animateRayPath);
        } else {
          // Finalize this step
          setTransformedRayPoints(
            calculateTransformedPoints(index, 1)
          );
          
          // Move to next step after a short delay
          setTimeout(() => {
            processStep(index + 1);
          }, delay / 2);
        }
      };
      
      // Start animation
      requestAnimationFrame(animateRayPath);
    };
    
    // Start processing sequence
    setTimeout(() => {
      processStep(0);
    }, delay);
  };
  
  // Reset folding animation
  const resetFolding = () => {
    if (foldingState === 'unfolded') {
      return;
    }
    
    // Reset state
    setFoldingState('unfolded');
    setCurrentFoldingStep(0);
    setTransformedRayPoints([]);
    animationInProgressRef.current = false;
  };
  
  return {
    foldingState,
    currentFoldingStep,
    registerRoomRef,
    transformedRayPoints,
    startFolding,
    resetFolding,
    foldingSequence
  };
};

export default useFoldingSimple;