import React from 'react';
import { StepType } from '../models/types';

interface ControlsProps {
  currentStep: StepType;
  reflectionOrder: number;
  canProceed: boolean;
  isAnimating?: boolean;
  onPreviousStep: () => void;
  onNextStep: () => void;
  onChangeReflectionOrder: (order: number) => void;
  onReset?: () => void;
}

const Controls: React.FC<ControlsProps> = ({
  currentStep,
  reflectionOrder,
  canProceed,
  isAnimating = false,
  onPreviousStep,
  onNextStep,
  onChangeReflectionOrder,
  onReset
}) => {
  const stepLabels = {
    1: 'Place Objects',
    2: 'Generate Virtual Rooms',
    3: 'Place Observer',
    4: 'Draw Ray Path',
    5: 'Fold Virtual Rooms'
  };
  
  return (
    <div className="control-panel">
      <div className="control-header">
        <h3>Step {currentStep}: {stepLabels[currentStep]}</h3>
      </div>
      
      <div className="step-instructions">
        {currentStep === 1 && (
          <p>Click on the grid to place an object. Toggle walls to make them mirrored (cyan).</p>
        )}
        {currentStep === 2 && (
          <div>
            <p>Virtual rooms are being generated based on the mirrored walls.</p>
            <label>
              Max Reflection Order: 
              <input
                type="range"
                min="1"
                max="3"
                value={reflectionOrder}
                onChange={(e) => onChangeReflectionOrder(parseInt(e.target.value))}
                disabled={isAnimating}
              />
              <span className="control-value">{reflectionOrder}</span>
            </label>
          </div>
        )}
        {currentStep === 3 && (
          <p>Click outside the original room to place the observer.</p>
        )}
        {currentStep === 4 && (
          <p>Click on a virtual object to draw a ray path from it to the observer.</p>
        )}
        {currentStep === 5 && (
          <p>Watch as the virtual rooms fold back to show the actual light path.</p>
        )}
      </div>
      
      <div className="button-group">
        <button
          onClick={onPreviousStep}
          disabled={currentStep === 1 || isAnimating}
        >
          Previous
        </button>
        
        <button
          className="primary"
          onClick={onNextStep}
          disabled={!canProceed || isAnimating}
        >
          {currentStep === 5 ? 'Restart' : 'Next'}
        </button>
        
        {onReset && (
          <button
            onClick={onReset}
            disabled={isAnimating}
          >
            Reset
          </button>
        )}
      </div>
    </div>
  );
};

export default Controls;