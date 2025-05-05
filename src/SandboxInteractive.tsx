import React, { useState, useEffect } from 'react';
import { useOpticsSandbox } from './api';
import { Room, ClickableVirtualObject } from './components';

function configToRoom(config: any) {
  return {
    id: 'original',
    width: config.width,
    height: config.height,
    walls: config.mirroredWalls,
    position: { x: 0, y: 0 },
    reflectionOrder: 0,
  };
}

const ROOM_SIZE = 300;

const SandboxInteractive: React.FC = () => {
  const { state } = useOpticsSandbox();
  const { room, object, observer, virtualRooms, virtualObjects, reflectionOrder } = state;
  const [currentOrder, setCurrentOrder] = useState(1);

  // Only show virtual rooms/objects up to currentOrder
  const visibleVirtualRooms = virtualRooms.filter(r => r.reflectionOrder <= currentOrder);
  const visibleVirtualObjects = virtualObjects.filter(o => {
    const vr = virtualRooms.find(r => r.id === o.roomId);
    return vr && vr.reflectionOrder <= currentOrder;
  });

  // Log diagnostic information when component mounts or when rooms/observer changes
  useEffect(() => {
    console.log('-------- DIAGNOSTIC INFORMATION --------');
    console.log('Original Room:', { 
      position: { x: 0, y: 0 },
      width: room.width,
      height: room.height,
      walls: room.mirroredWalls
    });
    console.log('Observer:', observer);
    console.log('Virtual Rooms:', visibleVirtualRooms);
    console.log('Virtual Objects:', visibleVirtualObjects);
    
    // Log room size and positions
    console.log('Room Size:', ROOM_SIZE);
    console.log('Room Grid Size:', { width: room.width, height: room.height });
    
    // Log absolute coordinates of rooms
    const allRoomsWithPositions = [
      { id: 'original', position: { x: 0, y: 0 }, isOriginal: true },
      ...visibleVirtualRooms.map(vr => ({ 
        id: vr.id, 
        position: { 
          x: vr.position.x * ROOM_SIZE,
          y: vr.position.y * ROOM_SIZE
        },
        isOriginal: false
      }))
    ];
    console.log('Room Absolute Positions:', allRoomsWithPositions);
    
    // Log observer absolute position
    if (observer) {
      const observerAbsolute = {
        x: (observer.position.x + 0.5) * (ROOM_SIZE / room.width),
        y: (observer.position.y + 0.5) * (ROOM_SIZE / room.height)
      };
      console.log('Observer Absolute Position:', observerAbsolute);
    }
    
    console.log('----------------------------------------');
  }, [room, observer, virtualRooms, visibleVirtualRooms, visibleVirtualObjects]);

  // --- Dynamic bounding box calculation ---
  // Include the original room at (0,0)
  const allRooms = [
    { position: { x: 0, y: 0 } },
    ...visibleVirtualRooms
  ];
  const minX = Math.min(...allRooms.map(r => r.position.x));
  const maxX = Math.max(...allRooms.map(r => r.position.x));
  const minY = Math.min(...allRooms.map(r => r.position.y));
  const maxY = Math.max(...allRooms.map(r => r.position.y));
  const numRoomsX = maxX - minX + 1;
  const numRoomsY = maxY - minY + 1;
  const containerWidth = numRoomsX * ROOM_SIZE;
  const containerHeight = numRoomsY * ROOM_SIZE;
  // Offset so that the top-left room is at (0,0)
  const offsetX = -minX * ROOM_SIZE;
  const offsetY = -minY * ROOM_SIZE;

  // Helper to get absolute position for a room
  const getRoomPosition = (roomObj: any) => {
    return {
      left: offsetX + roomObj.position.x * ROOM_SIZE,
      top: offsetY + roomObj.position.y * ROOM_SIZE,
    };
  };

  // Helper to get relative position for an object/observer in a room
  const getCellPosition = (pos: { x: number; y: number }, room: any) => {
    return {
      left: (pos.x + 0.5) * (ROOM_SIZE / room.width),
      top: (pos.y + 0.5) * (ROOM_SIZE / room.height),
      transform: 'translate(-50%, -50%)',
      position: 'absolute' as const,
    };
  };

  return (
    <div className="app">
      <h1>Reflection Sandbox</h1>
      
      <div className="instructions" style={{ marginBottom: 16, padding: '10px', background: '#f5f5f5', borderRadius: '4px' }}>
        <p>Click on any pink "×" virtual object to draw a direct ray from that object to the observer.</p>
        <p>The ray will appear <strong style={{ color: 'red' }}>red</strong> if the observer can see the virtual object through the original room, or <strong style={{ color: '#ffcccc' }}>light red</strong> if it's out of sight.</p>
      </div>
      
      <div style={{ marginBottom: 16 }}>
        <button onClick={() => setCurrentOrder(Math.max(1, currentOrder - 1))} disabled={currentOrder === 1}>Previous</button>
        <button onClick={() => setCurrentOrder(Math.min(reflectionOrder, currentOrder + 1))} disabled={currentOrder === reflectionOrder}>Next</button>
        <span style={{ marginLeft: 16 }}>Order: {currentOrder}</span>
      </div>
      <div className="simulation-outer">
        <div
          className="simulation-container"
          style={{
            position: 'relative',
            width: containerWidth,
            height: containerHeight,
            background: '#fff',
            overflow: 'visible',
          }}
        >
          {/* Original room */}
          <div
            className="original-room-container"
            style={{
              position: 'absolute',
              ...getRoomPosition({ position: { x: 0, y: 0 } }),
              width: ROOM_SIZE,
              height: ROOM_SIZE,
              zIndex: 2,
            }}
          >
            <Room
              room={configToRoom(room)}
              objects={object && object.position ? [{ id: 'object', position: object.position, isVirtual: false, roomId: 'original' }] : []}
              isInteractive={true}
            />
            {/* Observer in original room */}
            {observer && (
              <div
                className="observer"
                style={getCellPosition(observer.position, room)}
                title="Observer"
              />
            )}
          </div>
          {/* Virtual rooms */}
          {visibleVirtualRooms.map((vr) => (
            <div
              key={vr.id}
              className="virtual-room-container"
              style={{
                position: 'absolute',
                ...getRoomPosition(vr),
                border: '2px solid cyan',
                width: ROOM_SIZE,
                height: ROOM_SIZE,
                zIndex: 1,
                // Remove pointer-events: none from here to allow clicks on virtual objects
              }}
            >
              {/* Debug: Show room position */}
              <div style={{ 
                position: 'absolute', 
                top: -20, 
                left: 0, 
                fontSize: '10px', 
                color: '#333',
                backgroundColor: 'rgba(255,255,255,0.7)',
                padding: '2px'
              }}>
                {`Room: (${vr.position.x}, ${vr.position.y}) ${vr.reflectionWall} Order: ${vr.reflectionOrder}`}
              </div>
              
              <div style={{ pointerEvents: 'none' }}>
                <Room
                  room={vr}
                  objects={[]}
                  isInteractive={false}
                />
              </div>
              
              {/* Virtual objects in this room - now using ClickableVirtualObject */}
              {visibleVirtualObjects.filter(vo => vo.roomId === vr.id).map(vo => (
                <ClickableVirtualObject
                  key={vo.id}
                  virtualObject={vo}
                  observer={observer}
                  rooms={[{ id: 'original', position: { x: 0, y: 0 }, reflectionOrder: 0, width: room.width, height: room.height, walls: room.mirroredWalls }, ...virtualRooms]}
                  roomSize={ROOM_SIZE}
                  roomWidth={room.width}
                  roomHeight={room.height}
                  style={getCellPosition(vo.position, vr)}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SandboxInteractive;
