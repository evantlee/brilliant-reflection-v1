import React, { useState, useRef, useEffect } from 'react';
import { PlacedObject, Point, Room } from '../models/types';
import SimpleRayPath from './SimpleRayPath';
import ReactDOM from 'react-dom';

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
  // Reference to the root element for portal rendering
  const rootRef = useRef<HTMLElement | null>(null);

  // Find the root element once on mount
  useEffect(() => {
    rootRef.current = document.getElementById('root') || document.body;
  }, []);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent any parent handlers from firing
    console.log(`Clicked virtual object: ${virtualObject.id}`);
    setIsSelected(!isSelected);
  };

  // Find the containing room
  const virtualRoom = rooms.find(r => r.id === virtualObject.roomId);
  if (!virtualRoom) {
    console.error(`Room ${virtualObject.roomId} not found for virtual object`);
    return null;
  }

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

      {/* Use React Portal to render the ray path at the top level of the DOM for proper rendering */}
      {isSelected && rootRef.current && ReactDOM.createPortal(
        <SimpleRayPath
          virtualObject={virtualObject}
          observer={observer}
          rooms={rooms}
          roomSize={roomSize}
          roomWidth={roomWidth}
          roomHeight={roomHeight}
        />,
        rootRef.current
      )}
    </>
  );
};

export default ClickableVirtualObject; 