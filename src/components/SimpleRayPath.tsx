import React from 'react';
import { Point, PlacedObject, Room } from '../models/types';
import { 
  distance, 
  findRayRoomIntersections, 
  lineIntersectsRectangle 
} from '../utils/rayUtils';

interface SimpleRayPathProps {
  virtualObject: PlacedObject;
  observer: { position: Point };
  rooms: Room[];
  roomSize: number;
  roomWidth: number;
  roomHeight: number;
  transformedRayPoints?: Point[];
  foldingState?: 'unfolded' | 'folding' | 'folded';
  currentFoldingStep?: number;
}

// Add a RaySegment interface
interface RaySegment {
  start: Point;
  end: Point;
  roomId: string;
  segmentIndex?: number;
}

/**
 * A simplified ray path component that draws a straight line from a virtual object to the observer.
 * This represents how a user would directly view the virtual image.
 * Now with support for visualizing the folding process.
 */
const SimpleRayPath: React.FC<SimpleRayPathProps> = ({
  virtualObject,
  observer,
  rooms,
  roomSize,
  roomWidth,
  roomHeight,
  transformedRayPoints = [],
  foldingState = 'unfolded',
  currentFoldingStep = 0
}) => {
  // Find the original room
  const originalRoom = rooms.find(r => r.reflectionOrder === 0);
  
  if (!originalRoom) {
    console.error('Original room not found');
    return null;
  }

  // Find the virtual room we're in to compensate for its offset
  const virtualRoom = rooms.find(r => r.id === virtualObject.roomId);
  
  // Calculate offset compensation if we're in a virtual room
  const offsetX = virtualRoom && virtualRoom.id !== originalRoom.id 
    ? -(virtualRoom.position.x * roomSize - originalRoom.position.x * roomSize) 
    : 0;
    
  const offsetY = virtualRoom && virtualRoom.id !== originalRoom.id 
    ? -(virtualRoom.position.y * roomSize - originalRoom.position.y * roomSize) 
    : 0;

  // Convert room local coordinates to global coordinates
  const getGlobalCoordinates = (point: Point, roomId: string): Point => {
    const room = rooms.find(r => r.id === roomId);
    if (!room) return point;

    return {
      x: room.position.x * roomSize + ((point.x + 0.5) * roomSize / roomWidth),
      y: room.position.y * roomSize + ((point.y + 0.5) * roomSize / roomHeight)
    };
  };

  // Get the global coordinates of the virtual object and observer
  const virtualObjectGlobal = getGlobalCoordinates(virtualObject.position, virtualObject.roomId);
  const observerGlobal = getGlobalCoordinates(observer.position, originalRoom.id);

  // Calculate room boundaries in global coordinates for the original room
  const originalRoomLeft = originalRoom.position.x * roomSize;
  const originalRoomRight = originalRoomLeft + roomSize;
  const originalRoomTop = originalRoom.position.y * roomSize;
  const originalRoomBottom = originalRoomTop + roomSize;

  // Check if the ray passes through the original room using line-rectangle intersection
  const isVisible = lineIntersectsRectangle(
    virtualObjectGlobal, 
    observerGlobal,
    { x: originalRoomLeft, y: originalRoomTop },
    { x: originalRoomRight, y: originalRoomBottom }
  );

  // Generate segments for normal (unfolded) state
  const generateNormalSegments = (): RaySegment[] => {
    // Direction vector from object to observer
    const dx = observerGlobal.x - virtualObjectGlobal.x;
    const dy = observerGlobal.y - virtualObjectGlobal.y;

    // Get parametric intervals for each room intersection
    const slabs = findRayRoomIntersections(
      virtualObjectGlobal,
      observerGlobal,
      rooms,
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

    return segments;
  };

  // Generate segments for folded state based on transformed points
  const generateFoldedSegments = (): RaySegment[] => {
    // If no transformed points, return empty array
    if (!transformedRayPoints || transformedRayPoints.length === 0) {
      return [];
    }

    // Create segments from pairs of points
    const segments = [];
    for (let i = 0; i < transformedRayPoints.length; i += 2) {
      if (i + 1 < transformedRayPoints.length) {
        segments.push({
          start: transformedRayPoints[i],
          end: transformedRayPoints[i + 1],
          roomId: 'folded',
          segmentIndex: Math.floor(i / 2)
        });
      }
    }

    return segments;
  };

  // Determine which segments to display based on folding state
  const displaySegments = foldingState === 'unfolded' 
    ? generateNormalSegments() 
    : generateFoldedSegments();

  // Helper function to get color for a room segment
  const getSegmentColor = (roomId: string, segmentIndex?: number): string => {
    if (!isVisible) return '#ffcccc'; // Light red for not visible
    
    // For folded segments during folding
    if (roomId === 'folded') {
      // Create a gradient of colors based on segment index
      if (segmentIndex !== undefined) {
        // More vibrant colors with better differentiation for folded segments
        const colors = [
          '#ff3300', // Bright red 
          '#ff9900', // Orange
          '#33cc33', // Green
          '#3399ff', // Blue
          '#9933ff', // Purple
        ];
        return colors[segmentIndex % colors.length];
      }
      return '#ff3300'; // Default red for folded segments
    }
    
    // For outside segments
    if (roomId === 'outside') return '#ff00ff'; // Outside segments: magenta
    
    // For original room
    if (roomId === 'original') return '#ff9900'; // Original room: orange
    
    // For virtual rooms, extract the reflection order from the room ID
    const getReflectionOrder = (id: string): number => {
      if (id === 'original') return 0;
      
      // Extract reflection order from room ID format like "original-top-1" or "original-left-1-right-2"
      // Count the number of wall reference segments (e.g., "top-1", "left-1")
      const segments = id.split('-');
      // Every pair after "original" represents one reflection
      // Number of reflections is (segments.length - 1) / 2
      return Math.floor((segments.length - 1) / 2);
    };
    
    const reflectionOrder = getReflectionOrder(roomId);
    
    // Color based on reflection order
    switch (reflectionOrder) {
      case 0: return '#ff9900'; // Original: orange
      case 1: return '#0099ff'; // 1st order: blue
      case 2: return '#00cc66'; // 2nd order: green
      case 3: return '#cc00cc'; // 3rd order: purple
      case 4: return '#cccc00'; // 4th order: yellow
      case 5: return '#999999'; // 5th order: gray
      default: return '#333333'; // Higher orders: dark gray
    }
  };

  // Determine junction point size based on importance
  const getPointSize = (index: number): number => {
    // Highlight intersection points (which should be every other point)
    const isIntersection = index % 2 !== 0;
    
    // Make intersection points larger
    return isIntersection ? 6 : 4;
  };

  // Determine junction point color
  const getPointColor = (index: number): string => {
    // Highlight intersection points
    const isIntersection = index % 2 !== 0;
    return isIntersection ? '#ffff00' : '#ff0000';
  };

  // Render directly in the component tree with absolute positioning and offset compensation
  return (
    <div 
      className="ray-path-container" 
      style={{ 
        position: 'absolute', 
        top: 0, 
        left: 0, 
        right: 0, 
        bottom: 0, 
        pointerEvents: 'none', 
        zIndex: 9999, // Extremely high z-index to ensure rays are above everything
        transform: `translate(${offsetX}px, ${offsetY}px)`
      }}
    >
      <svg 
        className="ray-path" 
        style={{ 
          width: '100%', 
          height: '100%', 
          overflow: 'visible'
        }}
      >
        {/* Draw all ray segments */}
        {displaySegments.map((segment, index) => (
          <g key={index}>
            <line
              x1={segment.start.x}
              y1={segment.start.y}
              x2={segment.end.x}
              y2={segment.end.y}
              stroke={getSegmentColor(segment.roomId, segment.segmentIndex)}
              strokeWidth={foldingState !== 'unfolded' ? 3 : 2}
              strokeDasharray={isVisible || foldingState !== 'unfolded' ? '0' : '4,4'}
            />
            
            {/* Add reflection points at segment boundaries (except for start and end points) */}
            {foldingState !== 'unfolded' && (
              <>
                <circle
                  cx={segment.start.x}
                  cy={segment.start.y}
                  r={4}
                  fill={getSegmentColor(segment.roomId, segment.segmentIndex)}
                />
                <circle
                  cx={segment.end.x}
                  cy={segment.end.y}
                  r={4}
                  fill={getSegmentColor(segment.roomId, segment.segmentIndex)}
                />
              </>
            )}
          </g>
        ))}
        
        {/* Add markers at end points */}
        <circle
          cx={virtualObjectGlobal.x}
          cy={virtualObjectGlobal.y}
          r={5}
          fill={getSegmentColor(virtualObject.roomId, undefined)}
          stroke="white"
          strokeWidth={2}
        />
        <circle
          cx={observerGlobal.x}
          cy={observerGlobal.y}
          r={5}
          fill={isVisible ? '#ff9900' : '#ffcccc'} 
          stroke="white"
          strokeWidth={2}
        />

        {/* Add additional junction points for folded visualization */}
        {foldingState !== 'unfolded' && transformedRayPoints.map((point, index) => (
          <circle
            key={`junction-${index}`}
            cx={point.x}
            cy={point.y}
            r={getPointSize(index)}
            fill={getPointColor(index)}
            stroke="#000"
            strokeWidth={1}
          />
        ))}

        {/* Folding debug information overlay */}
        {foldingState === 'folding' && (
          <foreignObject
            x={0}
            y={0}
            width={300}
            height={150}
          >
            <div
              style={{
                position: 'absolute',
                left: 10,
                top: 10,
                backgroundColor: 'rgba(0, 0, 0, 0.7)',
                color: 'white',
                padding: '5px',
                fontSize: '10px',
                zIndex: 100,
                pointerEvents: 'none',
                borderRadius: '3px',
                maxWidth: '300px',
                maxHeight: '150px',
                overflow: 'auto'
              }}
            >
              <div>Step: {currentFoldingStep + 1} / {transformedRayPoints.length / 2}</div>
              <div>Points: {transformedRayPoints.length}</div>
            </div>
          </foreignObject>
        )}
      </svg>
    </div>
  );
};

export default SimpleRayPath; 