import React, { forwardRef } from 'react';
import Wall from './Wall';
import { Room as RoomType, PlacedObject, Point } from '../models/types';

interface RoomProps {
  room: RoomType;
  objects: PlacedObject[];
  onToggleWall?: (wall: 'top' | 'right' | 'bottom' | 'left') => void;
  onPlaceObject?: (position: Point) => void;
  onSelectObject?: (object: PlacedObject) => void;
  isInteractive?: boolean;
}

const Room = forwardRef<HTMLDivElement, RoomProps>(
  ({ room, objects, onToggleWall, onPlaceObject, onSelectObject, isInteractive = true }, ref) => {
    const handleGridClick = (e: React.MouseEvent<HTMLDivElement>) => {
      if (!onPlaceObject || !isInteractive) return;
      
      // Calculate grid position from click
      const rect = e.currentTarget.getBoundingClientRect();
      const x = Math.floor((e.clientX - rect.left) / (rect.width / room.width));
      const y = Math.floor((e.clientY - rect.top) / (rect.height / room.height));
      
      onPlaceObject({ x, y });
    };
    
    return (
      <div 
        ref={ref}
        className="room"
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${room.width}, 1fr)`,
          gridTemplateRows: `repeat(${room.height}, 1fr)`,
          width: '300px',
          height: '300px',
          position: 'relative',
        }}
        onClick={handleGridClick}
      >
        {/* Grid cells */}
        {Array.from({ length: room.width * room.height }).map((_, index) => (
          <div 
            key={index}
            className="cell"
            style={{ border: '1px solid #ddd' }}
          />
        ))}
        
        {/* Walls */}
        {isInteractive ? (
          <>
            <Wall 
              position="top" 
              isMirrored={room.walls.top} 
              onClick={() => onToggleWall?.('top')} 
            />
            <Wall 
              position="right" 
              isMirrored={room.walls.right} 
              onClick={() => onToggleWall?.('right')} 
            />
            <Wall 
              position="bottom" 
              isMirrored={room.walls.bottom} 
              onClick={() => onToggleWall?.('bottom')} 
            />
            <Wall 
              position="left" 
              isMirrored={room.walls.left} 
              onClick={() => onToggleWall?.('left')} 
            />
          </>
        ) : (
          <>
            <div className={`wall top ${room.walls.top ? 'mirrored' : ''}`} />
            <div className={`wall right ${room.walls.right ? 'mirrored' : ''}`} />
            <div className={`wall bottom ${room.walls.bottom ? 'mirrored' : ''}`} />
            <div className={`wall left ${room.walls.left ? 'mirrored' : ''}`} />
          </>
        )}
        
        {/* Objects */}
        {objects.filter(obj => obj && obj.position).map(obj => (
          <div
            key={obj.id}
            className={`object ${obj.isVirtual ? 'virtual' : ''}`}
            style={{
              position: 'absolute',
              left: `${(obj.position.x + 0.5) * (100 / room.width)}%`,
              top: `${(obj.position.y + 0.5) * (100 / room.height)}%`,
            }}
            onClick={() => onSelectObject?.(obj)}
          >
            ×
          </div>
        ))}
      </div>
    );
  }
);

export default Room;