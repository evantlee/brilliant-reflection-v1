import React from 'react';
import { Point } from '../models/types';

interface ObserverProps {
  position: Point;
}

const CELL_SIZE = 75;

const Observer: React.FC<ObserverProps> = ({ position }) => {
  // If observer is outside the grid, add extra offset for visibility
  const yOffset = position.y * CELL_SIZE + (position.y % 1 === 0 && position.y > 0 ? 10 : 0);
  return (
    <div
      className="observer"
      style={{
        position: 'absolute',
        left: `${position.x * CELL_SIZE}px`,
        top: `${yOffset}px`,
      }}
      title="Observer"
    />
  );
};

export default Observer;