import React, { useState } from 'react';
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
  const [showDebug, setShowDebug] = useState(false);
  
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
  // -- End segment generation --

  // Helper for drawing arrow in debug view
  const makeArrow = (start: Point, end: Point, color: string) => {
    const angle = Math.atan2(end.y - start.y, end.x - start.x);
    const arrowLen = 8;
    const arrowWid = 4;
    const tx = end.x;
    const ty = end.y;
    const bx = tx - arrowLen * Math.cos(angle);
    const by = ty - arrowLen * Math.sin(angle);
    const lx = bx - arrowWid * Math.sin(angle);
    const ly = by + arrowWid * Math.cos(angle);
    const rx = bx + arrowWid * Math.sin(angle);
    const ry = by - arrowWid * Math.cos(angle);
    return <polygon points={`${tx},${ty} ${lx},${ly} ${rx},${ry}`} fill={color} />;
  };

  // Helper function to get color for a room segment
  const getSegmentColor = (roomId: string, isVisible: boolean): string => {
    if (!isVisible) return '#ffcccc'; // Light red for not visible
    
    // For visible rays, use different colors for different rooms
    if (roomId === originalRoom.id) return '#ff0000'; // Original room: red
    if (roomId === virtualObject.roomId) return '#ff6600'; // Virtual object room: orange
    if (roomId === 'outside') return '#ff00ff'; // Outside segments: magenta
    
    // Other rooms get different colors based on position
    const room = rooms.find(r => r.id === roomId);
    if (room) {
      if (room.position.x < 0) return '#00cc66'; // Left rooms: green
      if (room.position.x > 0) return '#0099cc'; // Right rooms: blue
      if (room.position.y < 0) return '#cc9900'; // Top rooms: yellow
      if (room.position.y > 0) return '#cc00cc'; // Bottom rooms: purple
    }
    
    // Fallback colors
    const roomIndex = parseInt(roomId.replace(/[^\d]/g, '')) || 0;
    const colors = ['#ff3300', '#ff9900', '#66cc00', '#0099ff', '#9900cc'];
    return colors[roomIndex % colors.length];
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
        zIndex: 150,
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
        {/* Debug room boundaries */}
        {showDebug && rooms.map(room => {
          const roomLeft = room.position.x * roomSize;
          const roomRight = roomLeft + roomSize;
          const roomTop = room.position.y * roomSize;
          const roomBottom = roomTop + roomSize;
          
          return (
            <rect
              key={`room-${room.id}`}
              x={roomLeft}
              y={roomTop}
              width={roomSize}
              height={roomSize}
              fill="none"
              stroke={room.id === originalRoom.id ? "#ff0000" : "#00cccc"}
              strokeWidth={1}
              strokeDasharray="5,5"
            />
          );
        })}
        
        {/* Draw all ray segments */}
        {roomSegments.map((segment, index) => (
          <g key={index}>
            <line
              x1={segment.start.x}
              y1={segment.start.y}
              x2={segment.end.x}
              y2={segment.end.y}
              stroke={getSegmentColor(segment.roomId, isVisible)}
              strokeWidth={showDebug ? 3 : 2}
              strokeDasharray={isVisible ? '0' : '5,5'}
            />
            {showDebug && makeArrow(segment.start, segment.end, getSegmentColor(segment.roomId, isVisible))}
            
            {/* Segment labels with larger text for better visibility */}
            {showDebug && (
              <g>
                <circle
                  cx={(segment.start.x + segment.end.x) / 2}
                  cy={(segment.start.y + segment.end.y) / 2}
                  r={10}
                  fill="white"
                  fillOpacity="0.9"
                  stroke={getSegmentColor(segment.roomId, isVisible)}
                  strokeWidth={2}
                />
                <text
                  x={(segment.start.x + segment.end.x) / 2}
                  y={(segment.start.y + segment.end.y) / 2 + 4}
                  textAnchor="middle"
                  fontSize="10"
                  fontWeight="bold"
                  fontFamily="Arial, sans-serif"
                  fill={getSegmentColor(segment.roomId, isVisible)}
                >
                  {index}
                </text>
              </g>
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
          fill={isVisible ? '#ff0000' : '#ffcccc'}
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
            stroke={isVisible ? '#ff0000' : '#ffcccc'}
          />
          <text
            textAnchor="middle"
            y="5"
            fontSize="12"
            fontFamily="Arial, sans-serif"
            fill={isVisible ? '#ff0000' : '#ffcccc'}
          >
            {isVisible ? 'VISIBLE' : 'NOT VISIBLE'}
          </text>
        </g>
      </svg>
      
      {/* Debug toggle button - only this element has pointer events */}
      <div 
        style={{ 
          position: 'absolute',
          top: 10,
          left: 10,
          width: 36,
          height: 36,
          backgroundColor: showDebug ? 'rgba(255,100,100,0.9)' : 'rgba(100,100,255,0.9)',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontWeight: 'bold',
          fontSize: '20px',
          cursor: 'pointer',
          pointerEvents: 'auto',
          zIndex: 100,
          boxShadow: '0 0 5px rgba(0,0,0,0.3)',
          border: '2px solid white'
        }}
        onClick={() => setShowDebug(!showDebug)}
      >
        ?
      </div>
      
      {/* Debug mode banner - no pointer events */}
      {showDebug && (
        <div style={{ 
          position: 'absolute',
          top: 10,
          left: 60,
          backgroundColor: 'rgba(255,255,255,0.9)',
          border: '1px solid #000',
          padding: '5px 10px',
          zIndex: 99,
          borderRadius: '5px',
          boxShadow: '0 0 5px rgba(0,0,0,0.2)'
        }}>
          <div>Debug Mode: ON</div>
          <div>Orange: Virtual Object Room</div>
          <div>Red: Original Room, Magenta: Outside</div>
        </div>
      )}
    </div>
  );
};

export default SimpleRayPath; 