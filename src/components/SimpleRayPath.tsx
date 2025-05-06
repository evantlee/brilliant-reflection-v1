import React from 'react';
import { Point, PlacedObject, Room } from '../models/types';
import { 
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
}

/**
 * A simplified ray path component that draws a straight line from a virtual object to the observer.
 * This represents how a user would directly view the virtual image.
 */
const SimpleRayPath: React.FC<SimpleRayPathProps> = ({
  virtualObject,
  observer,
  rooms,
  roomSize,
  roomWidth,
  roomHeight
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

  // After computing midX, midY
  const midX = (virtualObjectGlobal.x + observerGlobal.x) / 2;
  const midY = (virtualObjectGlobal.y + observerGlobal.y) / 2;

  // -- Start slab-based segment generation --
  // Combine original and virtual rooms
  const allRooms = [originalRoom, ...rooms];
  // Get parametric intervals for each room
  const slabs = findRayRoomIntersections(
    virtualObjectGlobal,
    observerGlobal,
    allRooms,
    roomSize
  );
  console.debug('Slab segments:', slabs);

  // Direction vector from object to observer
  const dx = observerGlobal.x - virtualObjectGlobal.x;
  const dy = observerGlobal.y - virtualObjectGlobal.y;

  // Build segments for each slab
  let roomSegments = slabs.map(({ t0, t1, roomId }) => ({
    start: { x: virtualObjectGlobal.x + dx * t0, y: virtualObjectGlobal.y + dy * t0 },
    end:   { x: virtualObjectGlobal.x + dx * t1, y: virtualObjectGlobal.y + dy * t1 },
    roomId
  }));

  // Add final outside segment if ray continues beyond last slab
  if (slabs.length > 0) {
    const lastT = slabs[slabs.length - 1].t1;
    if (lastT < 1) {
      roomSegments.push({
        start: { x: virtualObjectGlobal.x + dx * lastT, y: virtualObjectGlobal.y + dy * lastT },
        end: observerGlobal,
        roomId: 'outside'
      });
    }
  } else {
    // No slabs -> direct line outside
    roomSegments = [{ start: virtualObjectGlobal, end: observerGlobal, roomId: 'outside' }];
  }
  
  // Get the lowest order room for each segment based on reflection order
  const roomSegmentsWithLowestOrder = roomSegments.map(segment => {
    // If it's the outside segment, keep it as is
    if (segment.roomId === 'outside') return segment;
    
    // Find all rooms containing this point (midpoint of segment)
    const midX = (segment.start.x + segment.end.x) / 2;
    const midY = (segment.start.y + segment.end.y) / 2;
    
    // Find all rooms that contain this point
    const containingRooms = allRooms.filter(room => {
      const roomLeft = room.position.x * roomSize;
      const roomRight = roomLeft + roomSize;
      const roomTop = room.position.y * roomSize;
      const roomBottom = roomTop + roomSize;
      
      return (
        midX >= roomLeft && midX <= roomRight &&
        midY >= roomTop && midY <= roomBottom
      );
    });
    
    // Sort by reflection order and get the lowest
    if (containingRooms.length > 0) {
      containingRooms.sort((a, b) => 
        (a.reflectionOrder || Infinity) - (b.reflectionOrder || Infinity)
      );
      
      const lowestOrderRoom = containingRooms[0];
      return {
        ...segment,
        roomId: lowestOrderRoom.id
      };
    }
    
    return segment;
  });
  // -- End segment generation --

  // Helper function to get color for a room segment
  const getSegmentColor = (roomId: string, isVisible: boolean): string => {
    if (!isVisible) return '#ffcccc'; // Light red for not visible
    
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
        {roomSegmentsWithLowestOrder.map((segment, index) => (
          <g key={index}>
            <line
              x1={segment.start.x}
              y1={segment.start.y}
              x2={segment.end.x}
              y2={segment.end.y}
              stroke={getSegmentColor(segment.roomId, isVisible)}
              strokeWidth={1.5}
              strokeDasharray={isVisible ? '0' : '4,4'}
            />
            
            {/* Add reflection points at segment boundaries (except for start and end points) */}
            {index > 0 && (
              <circle
                cx={segment.start.x}
                cy={segment.start.y}
                r={5} // Increased size for better visibility
                fill="white"
                stroke={getSegmentColor(segment.roomId, isVisible)}
                strokeWidth={2}
              />
            )}
          </g>
        ))}
        
        {/* Add markers at end points */}
        <circle
          cx={virtualObjectGlobal.x}
          cy={virtualObjectGlobal.y}
          r={5}
          fill={getSegmentColor(virtualObject.roomId, isVisible)}
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

        {/* Add visibility label */}
        <g transform={`translate(${midX}, ${midY})`}>
          <rect
            x="-40"
            y="-12"
            width="80"
            height="24"
            rx="4"
            fill="white"
            fillOpacity="0.8"
            stroke={isVisible ? '#ff9900' : '#ffcccc'}
          />
          <text
            textAnchor="middle"
            y="5"
            fontSize="12"
            fontFamily="Arial, sans-serif"
            fill={isVisible ? '#ff9900' : '#ffcccc'}
          >
            {isVisible ? 'VISIBLE' : 'NOT VISIBLE'}
          </text>
        </g>
      </svg>
    </div>
  );
};

export default SimpleRayPath; 