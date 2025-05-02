import React from 'react';

interface WallProps {
  position: 'top' | 'right' | 'bottom' | 'left';
  isMirrored: boolean;
  onClick: () => void;
}

const Wall: React.FC<WallProps> = ({ position, isMirrored, onClick }) => {
  return (
    <div 
      className={`wall ${position} ${isMirrored ? 'mirrored' : ''}`}
      onClick={onClick}
      title={isMirrored ? 'Mirrored' : 'Click to toggle mirror'}
    />
  );
};

export default Wall;