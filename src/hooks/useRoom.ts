import { useState, useEffect } from 'react';
import { Room, PlacedObject, Point, Observer } from '../models/types';
import { generateVirtualRooms } from '../utils/roomUtils';
import { placeVirtualObjects } from '../utils/reflectionUtils';

interface UseRoomOptions {
  width?: number;
  height?: number;
  initialReflectionOrder?: number;
}

export const useRoom = (options: UseRoomOptions = {}) => {
  const { width = 4, height = 4, initialReflectionOrder = 1 } = options;
  
  // Original room
  const [originalRoom, setOriginalRoom] = useState<Room>({
    id: 'original',
    width,
    height,
    walls: { top: false, right: false, bottom: false, left: false },
    position: { x: 0, y: 0 },
    reflectionOrder: 0
  });
  
  // Objects
  const [objects, setObjects] = useState<PlacedObject[]>([]);
  
  // Observer
  const [observer, setObserver] = useState<Observer | null>(null);
  
  // Virtual rooms
  const [virtualRooms, setVirtualRooms] = useState<Room[]>([]);
  
  // Virtual objects
  const [virtualObjects, setVirtualObjects] = useState<PlacedObject[]>([]);
  
  // Reflection order
  const [reflectionOrder, setReflectionOrder] = useState(initialReflectionOrder);
  
  // Generate virtual rooms when room configuration changes
  useEffect(() => {
    const newVirtualRooms = generateVirtualRooms(originalRoom, reflectionOrder);
    setVirtualRooms(newVirtualRooms);
  }, [originalRoom, reflectionOrder]);
  
  // Generate virtual objects when real objects change
  useEffect(() => {
    if (objects.length > 0) {
      const realObjects = objects.filter(obj => !obj.isVirtual);
      const newVirtualObjects = placeVirtualObjects(realObjects, virtualRooms, originalRoom);
      setVirtualObjects(newVirtualObjects);
    } else {
      setVirtualObjects([]);
    }
  }, [objects, virtualRooms, originalRoom]);
  
  // Toggle a wall mirror
  const toggleWall = (wall: 'top' | 'right' | 'bottom' | 'left') => {
    setOriginalRoom(prev => ({
      ...prev,
      walls: {
        ...prev.walls,
        [wall]: !prev.walls[wall]
      }
    }));
  };
  
  // Place an object
  const placeObject = (position: Point, replace = false) => {
    const newObject: PlacedObject = {
      id: `object-${Date.now()}`,
      position,
      isVirtual: false,
      roomId: originalRoom.id
    };
    setObjects(prev => {
      const nonVirtual = prev.filter(obj => !obj.isVirtual);
      const virtual = prev.filter(obj => obj.isVirtual);
      return [
        ...(replace ? [] : nonVirtual),
        newObject,
        ...virtual
      ];
    });
  };
  
  // Place observer
  const placeObserver = (position: Point) => {
    setObserver({ position });
  };
  
  // Reset everything
  const reset = () => {
    setOriginalRoom({
      id: 'original',
      width,
      height,
      walls: { top: false, right: false, bottom: false, left: false },
      position: { x: 0, y: 0 },
      reflectionOrder: 0
    });
    setObjects([]);
    setObserver(null);
    setVirtualRooms([]);
    setVirtualObjects([]);
    setReflectionOrder(initialReflectionOrder);
  };
  
  return {
    originalRoom,
    objects: [...objects, ...virtualObjects],
    realObjects: objects.filter(obj => !obj.isVirtual),
    virtualObjects,
    observer,
    virtualRooms,
    reflectionOrder,
    toggleWall,
    placeObject,
    placeObserver,
    setReflectionOrder,
    reset
  };
};

export default useRoom;