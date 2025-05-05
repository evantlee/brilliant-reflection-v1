import React, { useState } from 'react';
import { PlacedObject, Point, Room } from '../models/types';
import SimpleRayPath from './SimpleRayPath';

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

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent any parent handlers from firing
    console.log(`Clicked virtual object: ${virtualObject.id}`);
    setIsSelected(!isSelected);
  };

  return (
    <>
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
        />
      )}
    </>
  );
};

export default ClickableVirtualObject; 