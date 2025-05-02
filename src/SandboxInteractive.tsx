import React, { useState } from 'react';
import { useOpticsSandbox } from './api';
import { Room } from './components';

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

  // Debug: Log room and object coordinates
  console.log('Original Room:', { position: { x: 0, y: 0 } });
  console.log('Virtual Rooms:', visibleVirtualRooms.map(vr => ({ 
    id: vr.id, 
    position: vr.position,
    reflectionWall: vr.reflectionWall,
    reflectionOrder: vr.reflectionOrder
  })));
  console.log('Virtual Objects:', visibleVirtualObjects.map(vo => ({
    id: vo.id,
    roomId: vo.roomId,
    position: vo.position
  })));

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
                pointerEvents: 'none',
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
              
              <Room
                room={vr}
                objects={[]}
                isInteractive={false}
              />
              {/* Virtual object in this room */}
              {visibleVirtualObjects.filter(o => o.roomId === vr.id).map(vo => (
                <div
                  key={vo.id}
                  className="object virtual"
                  style={getCellPosition(vo.position, vr)}
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
                    {`(${vo.position.x.toFixed(1)}, ${vo.position.y.toFixed(1)})`}
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SandboxInteractive;
