import React from 'react';
import { Room } from '../models/types';
import '../styles/FoldingControls.css';

interface FoldingControlsProps {
  selectedRoom: Room;
  onDirectionSelected: (direction: 'top' | 'right' | 'bottom' | 'left') => void;
}

/**
 * Displays arrow controls around a selected virtual object to guide the user
 * through the folding process. Only shows arrows that would bring the path
 * closer to the original room (0,0).
 */
const FoldingControls: React.FC<FoldingControlsProps> = ({
  selectedRoom,
  onDirectionSelected
}) => {
  // Determine which arrows to show based on room position
  // Only show arrows that would bring us closer to (0,0)
  // The direction indicates which wall to fold ACROSS to move toward (0,0)
  
  // If we're below original (y > 0), we need to fold up (across top wall)
  const showTopArrow = selectedRoom.position.y > 0;
  
  // If we're left of original (x < 0), we need to fold right (across right wall)
  const showRightArrow = selectedRoom.position.x < 0;
  
  // If we're above original (y < 0), we need to fold down (across bottom wall)
  const showBottomArrow = selectedRoom.position.y < 0;
  
  // If we're right of original (x > 0), we need to fold left (across left wall)
  const showLeftArrow = selectedRoom.position.x > 0;

  return (
    <div className="folding-controls">
      {showTopArrow && (
        <button 
          className="arrow top" 
          onClick={() => onDirectionSelected('top')}
          title="Fold along top wall toward original room"
        >
          ↑
        </button>
      )}
      
      {showRightArrow && (
        <button 
          className="arrow right" 
          onClick={() => onDirectionSelected('right')}
          title="Fold along right wall toward original room"
        >
          →
        </button>
      )}
      
      {showBottomArrow && (
        <button 
          className="arrow bottom" 
          onClick={() => onDirectionSelected('bottom')}
          title="Fold along bottom wall toward original room"
        >
          ↓
        </button>
      )}
      
      {showLeftArrow && (
        <button 
          className="arrow left" 
          onClick={() => onDirectionSelected('left')}
          title="Fold along left wall toward original room"
        >
          ←
        </button>
      )}
    </div>
  );
};

export default FoldingControls; 