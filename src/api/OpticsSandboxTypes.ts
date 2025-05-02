/**
 * Types for the OpticsSandbox API and state.
 *
 * This API is designed for maximum clarity and extensibility, allowing both engineers and AI to configure and control the sandbox.
 * All state is externally configurable and observable. All core actions (place object, move observer, toggle wall, etc.) are exposed as methods.
 * Events allow for AI or other systems to react to user actions.
 */

import type { Room, PlacedObject } from '../models/types';

export interface RoomConfig {
  width: number;
  height: number;
  mirroredWalls: { top: boolean; right: boolean; bottom: boolean; left: boolean };
}

export interface ObjectConfig {
  position: { x: number; y: number };
}

export interface ObserverConfig {
  position: { x: number; y: number };
}

export interface OpticsSandboxConfig {
  room?: Partial<RoomConfig>;
  object?: ObjectConfig;
  observer?: ObserverConfig;
  // Extend with more config options as needed
}

export interface OpticsSandboxState {
  room: RoomConfig;
  object?: ObjectConfig;
  observer: ObserverConfig;
  virtualRooms: Room[];
  virtualObjects: PlacedObject[];
  reflectionOrder: number;
}

export interface OpticsSandboxAPI {
  setRoom(config: Partial<RoomConfig>): void;
  setObject(config: ObjectConfig): void;
  setObserver(config: ObserverConfig): void;
  setReflectionOrder(order: number): void;
  getState(): OpticsSandboxState;
  // Add more methods/events as needed
}
