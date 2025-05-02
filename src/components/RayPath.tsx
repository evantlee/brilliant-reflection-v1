import React from 'react';
import { RayPath as RayPathType } from '../models/types';

interface RayPathProps {
  path: RayPathType;
  highlighted?: boolean;
}

const RayPath: React.FC<RayPathProps> = ({ path, highlighted = false }) => {
  const pathPoints = path.points.map((point) => `${point.x * 75},${point.y * 75}`).join(' ');
  
  return (
    <svg className="ray-path" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
      <polyline
        points={pathPoints}
        fill="none"
        stroke={highlighted ? '#ff0000' : '#f06'}
        strokeWidth={highlighted ? 3 : 2}
        strokeDasharray={highlighted ? '0' : '5,5'}
      />
      
      {/* Reflection points markers */}
      {path.reflectionPoints.map((reflection, index) => (
        <circle
          key={index}
          cx={reflection.point.x * 75}
          cy={reflection.point.y * 75}
          r={4}
          fill={highlighted ? '#ff0000' : '#f06'}
        />
      ))}
    </svg>
  );
};

export default RayPath;