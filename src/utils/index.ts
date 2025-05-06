export * from './roomUtils';
export * from './reflectionUtils';
// Re-export from foldingUtils with explicit naming to avoid name collisions
export {
  calculateTransformOrigin,
  getRotationForWall,
  getOppositeWall,
  reflectPointOverWall,
  findSegmentWallIntersection,
  findRoomAfterWall,
  getFoldingSequence,
  getFoldProgress,
  calculateFoldMatrix,
  reflectPointOverWall as foldingReflectPointOverWall,
  isPointBehindWall,
  foldRayPath,
  generateFoldingSequence,
  extractPointsFromSegments,
  isFoldValid,
  applyFoldingToRayPoint
} from './foldingUtils';
export * from './rayUtils';