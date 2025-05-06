/**
 * OpticsSandboxContext
 *
 * Provides a clean, minimal, and extensible context for the OpticsSandbox API.
 * All state and actions are accessible via this context, and can be used by UI or external code (AI, automation, etc).
 *
 * Usage:
 *   <OpticsSandboxProvider config={...}>
 *     <YourSandboxUI />
 *   </OpticsSandboxProvider>
 *
 *   const { state, setRoom, setObject, setObserver } = useOpticsSandbox();
 */
import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import {
  RoomConfig,
  ObjectConfig,
  ObserverConfig,
  OpticsSandboxConfig,
  OpticsSandboxState,
} from './OpticsSandboxTypes';
import { generateVirtualRooms } from '../utils/roomUtils';
import { placeVirtualObjects, testReflectionTransformations } from '../utils/reflectionUtils';
import type { Room, PlacedObject } from '../models/types';

// Run tests once on load
setTimeout(() => {
  console.log("Running reflection tests...");
  testReflectionTransformations();
}, 1000);

const defaultRoom: RoomConfig = {
  width: 4,
  height: 4,
  mirroredWalls: { top: true, right: true, bottom: false, left: true },
};

const getDefaultObserver = (room: RoomConfig): ObserverConfig => ({
  position: { x: Math.floor(room.width / 2), y: room.height }, // just below the room, centered
});

const OpticsSandboxContext = createContext<{
  state: OpticsSandboxState;
  setRoom: (config: Partial<RoomConfig>) => void;
  setObject: (config: ObjectConfig) => void;
  setObserver: (config: ObserverConfig) => void;
  setReflectionOrder: (order: number) => void;
} | undefined>(undefined);

export const OpticsSandboxProvider: React.FC<{ config?: OpticsSandboxConfig; children: React.ReactNode }> = ({ config, children }) => {
  const initialRoom = { ...defaultRoom, ...config?.room };
  const [reflectionOrder, setReflectionOrder] = useState<number>(config?.reflectionOrder || 3);
  const [state, setState] = useState<OpticsSandboxState>({
    room: initialRoom,
    object: config?.object && config?.object.position ? config.object : undefined,
    observer: config?.observer || getDefaultObserver(initialRoom),
    virtualRooms: [],
    virtualObjects: [],
    reflectionOrder: config?.reflectionOrder || 3,
  });

  // Recalculate virtual rooms and objects when room, object, or reflectionOrder changes
  useEffect(() => {
    const roomForVirtuals: Room = {
      id: 'original',
      width: state.room.width,
      height: state.room.height,
      walls: state.room.mirroredWalls,
      position: { x: 0, y: 0 },
      reflectionOrder: 0,
    };
    const virtualRooms = generateVirtualRooms(roomForVirtuals, reflectionOrder);
    const virtualObjects = state.object && state.object.position
      ? placeVirtualObjects([
          { id: 'object', position: state.object.position, isVirtual: false, roomId: 'original' } as PlacedObject
        ], virtualRooms, roomForVirtuals)
      : [];
    setState(prev => ({
      ...prev,
      virtualRooms,
      virtualObjects,
      reflectionOrder,
    }));
  }, [state.room, state.object, reflectionOrder]);

  const setRoom = useCallback((roomConfig: Partial<RoomConfig>) => {
    setState(prev => ({ ...prev, room: { ...prev.room, ...roomConfig } }));
  }, []);

  const setObject = useCallback((objectConfig: ObjectConfig) => {
    if (!objectConfig || !objectConfig.position) return;
    setState(prev => ({ ...prev, object: objectConfig }));
  }, []);

  const setObserver = useCallback((observerConfig: ObserverConfig) => {
    setState(prev => ({ ...prev, observer: observerConfig }));
  }, []);

  return (
    <OpticsSandboxContext.Provider value={{ state, setRoom, setObject, setObserver, setReflectionOrder }}>
      {children}
    </OpticsSandboxContext.Provider>
  );
};

export function useOpticsSandbox() {
  const ctx = useContext(OpticsSandboxContext);
  if (!ctx) throw new Error('useOpticsSandbox must be used within an OpticsSandboxProvider');
  return ctx;
}
