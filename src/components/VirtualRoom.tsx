import { forwardRef } from 'react';
import Room from './Room';
import { Room as RoomType, PlacedObject } from '../models/types';

interface VirtualRoomProps {
  room: RoomType;
  objects: PlacedObject[];
  onSelectObject?: (object: PlacedObject) => void;
  isSelected?: boolean;
}

const VirtualRoom = forwardRef<HTMLDivElement, VirtualRoomProps>(
  ({ room, objects, onSelectObject, isSelected = false }, ref) => {
    return (
      <div 
        ref={ref}
        className={`virtual-room-container ${isSelected ? 'selected' : ''}`}
        style={{
          position: 'absolute',
          left: `${300 + room.position.x * 75}px`,
          top: `${300 + room.position.y * 75}px`,
          transition: 'transform 0.5s ease',
          transformStyle: 'preserve-3d',
          zIndex: isSelected ? 2 : 1,
        }}
      >
        <Room
          room={room}
          objects={objects}
          onSelectObject={onSelectObject}
          isInteractive={false}
        />
        
        {/* Label showing reflection order */}
        <div
          style={{
            position: 'absolute',
            top: -20,
            left: 0,
            fontSize: '12px',
            color: '#666',
            whiteSpace: 'nowrap',
          }}
        >
          {`Order ${room.reflectionOrder} (${room.reflectionWall})`}
        </div>
      </div>
    );
  }
);

export default VirtualRoom;