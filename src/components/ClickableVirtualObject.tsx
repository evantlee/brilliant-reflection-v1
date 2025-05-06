import React, { useState, useEffect } from 'react';
import { PlacedObject, Point, Room, FoldingState } from '../models/types';
import SimpleRayPath from './SimpleRayPath';
import FoldingControls from './FoldingControls';
import { foldRayPath, isPointBehindWall, extractPointsFromSegments } from '../utils/foldingUtils';
import { findRayRoomIntersections } from '../utils/rayUtils';

interface ClickableVirtualObjectProps {
  virtualObject: PlacedObject;
  observer: { position: Point };
  rooms: Room[];
  roomSize: number;
  roomWidth: number;
  roomHeight: number;
  style: React.CSSProperties;
}

/**
 * A clickable virtual object that shows a ray path to the observer when clicked.
 * 
 * This component allows users to visualize how light travels from virtual objects
 * to the observer, showing the path across all rooms.
 */
const ClickableVirtualObject: React.FC<ClickableVirtualObjectProps> = ({
  virtualObject,
  observer,
  rooms,
  roomSize,
  roomWidth,
  roomHeight,
  style
}) => {
  const [isSelected, setIsSelected] = useState(false);
  const [foldingState, setFoldingState] = useState<FoldingState>('unfolded');
  const [currentSelectedRoom, setCurrentSelectedRoom] = useState<Room | null>(null);
  const [foldingStep, setFoldingStep] = useState(0);
  const [transformedRayPoints, setTransformedRayPoints] = useState<Point[]>([]);
  const [rayPathSegments, setRayPathSegments] = useState<Array<{start: Point, end: Point, roomId: string}>>([]);
  
  // Get virtual object and observer global coordinates
  const getGlobalCoordinates = (point: Point, roomId: string): Point => {
    const room = rooms.find(r => r.id === roomId);
    if (!room) return point;

    return {
      x: room.position.x * roomSize + ((point.x + 0.5) * roomSize / roomWidth),
      y: room.position.y * roomSize + ((point.y + 0.5) * roomSize / roomHeight)
    };
  };
  
  // Calculate ray path segments when selected
  useEffect(() => {
    if (!isSelected || !observer) return;
    
    // Get global coordinates
    const virtualObjectGlobal = getGlobalCoordinates(virtualObject.position, virtualObject.roomId);
    const observerRoom = rooms.find(r => r.reflectionOrder === 0);
    if (!observerRoom) return;
    
    const observerGlobal = getGlobalCoordinates(observer.position, observerRoom.id);
    
    // Find all rooms for slabs
    const allRooms = [
      rooms.find(r => r.reflectionOrder === 0), 
      ...rooms.filter(r => r.id !== 'original')
    ].filter(Boolean) as Room[];
    
    // Direction vector from object to observer
    const dx = observerGlobal.x - virtualObjectGlobal.x;
    const dy = observerGlobal.y - virtualObjectGlobal.y;
    
    // Get parametric intervals for each room
    const slabs = findRayRoomIntersections(
      virtualObjectGlobal,
      observerGlobal,
      allRooms,
      roomSize
    );
    
    // Build segments for each slab
    let segments = slabs.map(({ t0, t1, roomId }) => ({
      start: { x: virtualObjectGlobal.x + dx * t0, y: virtualObjectGlobal.y + dy * t0 },
      end: { x: virtualObjectGlobal.x + dx * t1, y: virtualObjectGlobal.y + dy * t1 },
      roomId
    }));
    
    // Add final outside segment if ray continues beyond last slab
    if (slabs.length > 0) {
      const lastT = slabs[slabs.length - 1].t1;
      if (lastT < 1) {
        segments.push({
          start: { x: virtualObjectGlobal.x + dx * lastT, y: virtualObjectGlobal.y + dy * lastT },
          end: observerGlobal,
          roomId: 'outside'
        });
      }
    } else {
      // No slabs -> direct line outside
      segments = [{ start: virtualObjectGlobal, end: observerGlobal, roomId: 'outside' }];
    }
    
    setRayPathSegments(segments);
    
    // Create the initial points array - include ALL segment endpoints
    const points: Point[] = [];
    segments.forEach(segment => {
      // Always add both start and end points to ensure complete path coverage
      points.push(segment.start);
      points.push(segment.end);
    });
    
    // Deduplicate points with a small epsilon to account for floating point imprecision
    const uniquePoints: Point[] = [];
    const epsilon = 0.1; // Threshold for deduplication
    
    points.forEach(point => {
      // Check if this point is already in the uniquePoints array (within epsilon)
      const isDuplicate = uniquePoints.some(existing => 
        Math.abs(existing.x - point.x) < epsilon && 
        Math.abs(existing.y - point.y) < epsilon
      );
      
      if (!isDuplicate) {
        uniquePoints.push(point);
      }
    });
    
    setTransformedRayPoints(uniquePoints);
  }, [isSelected, virtualObject, observer, rooms, roomSize, roomWidth, roomHeight]);
  
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent any parent handlers from firing
    console.log(`Clicked virtual object: ${virtualObject.id}`);
    
    const wasSelected = isSelected;
    setIsSelected(!isSelected);
    
    // Reset folding state when selecting/deselecting
    if (!wasSelected) {
      // Just selected
      setFoldingState('unfolded');
      setFoldingStep(0);
      const selectedRoom = rooms.find(r => r.id === virtualObject.roomId);
      setCurrentSelectedRoom(selectedRoom || null);
    } else {
      // Just deselected
      setCurrentSelectedRoom(null);
    }
  };
  
  // Handle direction selection for folding
  const handleDirectionSelected = (direction: 'top' | 'right' | 'bottom' | 'left') => {
    if (!currentSelectedRoom) return;
    
    console.log(`Folding in direction: ${direction}`);
    
    // Find the adjacent room in the selected direction
    const currentPosition = currentSelectedRoom.position;
    let nextPosition: Point;
    
    switch (direction) {
      case 'top':
        nextPosition = { x: currentPosition.x, y: currentPosition.y - 1 };
        break;
      case 'right':
        nextPosition = { x: currentPosition.x + 1, y: currentPosition.y };
        break;
      case 'bottom':
        nextPosition = { x: currentPosition.x, y: currentPosition.y + 1 };
        break;
      case 'left':
        nextPosition = { x: currentPosition.x - 1, y: currentPosition.y };
        break;
    }
    
    // Find the room at this position
    const nextRoom = rooms.find(r => 
      r.position.x === nextPosition.x && 
      r.position.y === nextPosition.y
    );
    
    if (!nextRoom) {
      console.error('Could not find next room in direction:', direction);
      return;
    }
    
    // Update state to show we're folding
    setFoldingState('folding');
    setFoldingStep(prevStep => prevStep + 1);
    
    // Update the current selected room
    setCurrentSelectedRoom(nextRoom);
    
    // Perform folding transformation on ray points
    const foldedPoints = foldRayPath(
      transformedRayPoints, 
      currentSelectedRoom.position, 
      roomSize, 
      direction
    );
    
    setTransformedRayPoints(foldedPoints);
    
    // Reset to unfolded state once we reach the original room
    if (nextRoom.position.x === 0 && nextRoom.position.y === 0) {
      setTimeout(() => {
        setFoldingState('folded');
      }, 500);
    }
  };
  
  // Reset folding to start over
  const handleResetFolding = () => {
    // Reset to initial state
    setFoldingState('unfolded');
    setFoldingStep(0);
    
    // Set selected room back to the original virtual object's room
    const selectedRoom = rooms.find(r => r.id === virtualObject.roomId);
    setCurrentSelectedRoom(selectedRoom || null);
    
    // Reset ray points to initial state by rebuilding from segments
    const points: Point[] = [];
    
    // Make sure to include ALL segment endpoints for a complete path
    rayPathSegments.forEach((segment, index) => {
      // Always add start point
      points.push(segment.start);
      
      // Always add the end point of the segment
      points.push(segment.end);
    });
    
    // Deduplicate points to avoid extremely close points
    const uniquePoints: Point[] = [];
    const epsilon = 0.1; // Small threshold for deduplication
    
    points.forEach(point => {
      const isDuplicate = uniquePoints.some(existing => 
        Math.abs(existing.x - point.x) < epsilon && 
        Math.abs(existing.y - point.y) < epsilon
      );
      
      if (!isDuplicate) {
        uniquePoints.push(point);
      }
    });
    
    setTransformedRayPoints(uniquePoints);
  };

  return (
    <>
      {/* Object marker */}
      <div
        className={`object virtual ${isSelected ? 'selected' : ''}`}
        style={{
          ...style,
          cursor: 'pointer',
          color: isSelected ? '#ff3388' : '#f0b',
          fontWeight: isSelected ? 'bold' : 'normal',
          fontSize: isSelected ? '24px' : '20px',
          zIndex: isSelected ? 20 : 10, // Ensure selected objects appear above others
          pointerEvents: 'auto' // Explicitly enable pointer events
        }}
        onClick={handleClick}
      >
        ×
        {/* Debug: Show object position */}
        <span style={{
          position: 'absolute',
          fontSize: '8px',
          color: '#f06',
          top: '10px',
          left: 0,
          whiteSpace: 'nowrap',
          backgroundColor: 'rgba(255,255,255,0.7)',
          padding: '1px'
        }}>
          {`(${virtualObject.position.x.toFixed(1)}, ${virtualObject.position.y.toFixed(1)})`}
        </span>
      </div>

      {/* Draw ray path when selected */}
      {isSelected && (
        <SimpleRayPath
          virtualObject={virtualObject}
          observer={observer}
          rooms={rooms}
          roomSize={roomSize}
          roomWidth={roomWidth}
          roomHeight={roomHeight}
          foldingState={foldingState}
          transformedRayPoints={transformedRayPoints}
          currentFoldingStep={foldingStep}
        />
      )}
      
      {/* Show folding controls when selected but only if we're not in original room */}
      {isSelected && currentSelectedRoom && (currentSelectedRoom.position.x !== 0 || currentSelectedRoom.position.y !== 0) && (
        <div 
          style={{
            position: 'absolute',
            width: 0,
            height: 0,
            left: style.left,
            top: style.top,
            zIndex: 99
          }}
        >
          <FoldingControls
            selectedRoom={currentSelectedRoom}
            onDirectionSelected={handleDirectionSelected}
          />
        </div>
      )}
      
      {/* Reset button - show when folding is in progress or completed */}
      {isSelected && (foldingState === 'folding' || foldingState === 'folded') && (
        <div style={{
          position: 'absolute',
          top: '40px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 1001 // Higher than the arrows to ensure it's clickable
        }}>
          <button 
            className="reset-button"
            onClick={handleResetFolding}
            style={{
              padding: '4px 8px',
              backgroundColor: '#ff3388',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 'bold',
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
              pointerEvents: 'auto'
            }}
          >
            Reset Folding
          </button>
        </div>
      )}
    </>
  );
};

export default ClickableVirtualObject; 