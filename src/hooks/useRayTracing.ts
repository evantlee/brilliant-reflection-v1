import { useState, useEffect } from 'react';
import { PlacedObject, Observer, RayPath, Room } from '../models/types';
import { traceRayFromVirtualToReal } from '../utils/reflectionUtils';

interface UseRayTracingOptions {
  enableAutoTrace?: boolean;
}

export const useRayTracing = (
  virtualObjects: PlacedObject[],
  observer: Observer | null,
  rooms: Room[],
  originalRoom: Room,
  options: UseRayTracingOptions = {}
) => {
  const { enableAutoTrace = false } = options;
  
  // Selected virtual object
  const [selectedVirtualObject, setSelectedVirtualObject] = useState<PlacedObject | null>(null);
  
  // Ray path
  const [rayPath, setRayPath] = useState<RayPath | null>(null);
  
  // Available ray paths
  const [availableRayPaths, setAvailableRayPaths] = useState<RayPath[]>([]);
  
  // Trace ray when selected object or observer changes
  useEffect(() => {
    if (selectedVirtualObject && observer) {
      const path = traceRayFromVirtualToReal(
        selectedVirtualObject,
        observer,
        rooms,
        originalRoom
      );
      
      if (path) {
        setRayPath({
          ...path,
          virtualObjectId: selectedVirtualObject.id
        });
      } else {
        setRayPath(null);
      }
    } else {
      setRayPath(null);
    }
  }, [selectedVirtualObject, observer, rooms, originalRoom]);
  
  // Find all available ray paths when observer changes
  useEffect(() => {
    if (!observer || virtualObjects.length === 0) {
      setAvailableRayPaths([]);
      return;
    }
    
    const paths: RayPath[] = [];
    
    virtualObjects.forEach(vObj => {
      const path = traceRayFromVirtualToReal(vObj, observer, rooms, originalRoom);
      if (path) {
        paths.push({
          ...path,
          virtualObjectId: vObj.id
        });
      }
    });
    
    setAvailableRayPaths(paths);
    
    // If auto trace is enabled and we have exactly one path available,
    // automatically select it
    if (enableAutoTrace && paths.length === 1) {
      const objectId = paths[0].virtualObjectId;
      const object = virtualObjects.find(obj => obj.id === objectId) || null;
      setSelectedVirtualObject(object);
    }
  }, [virtualObjects, observer, rooms, originalRoom, enableAutoTrace]);
  
  // Select a virtual object for ray tracing
  const selectVirtualObject = (object: PlacedObject | null) => {
    setSelectedVirtualObject(object);
  };
  
  return {
    selectedVirtualObject,
    rayPath,
    availableRayPaths,
    selectVirtualObject
  };
};

export default useRayTracing;