export interface Point {
  x: number;
  y: number;
}

export interface Room {
  id: string;
  width: number;
  height: number;
  walls: {
    top: boolean;
    right: boolean;
    bottom: boolean;
    left: boolean;
  };
  position: Point;
  reflectionOrder: number;
  reflectionWall?: 'top' | 'right' | 'bottom' | 'left';
  parentRoomId?: string;
}

export interface PlacedObject {
  id: string;
  position: Point;
  isVirtual: boolean;
  roomId: string;
}

export interface Observer {
  position: Point;
}

export interface RayPath {
  segments: Array<{
    start: Point;
    end: Point;
    roomId: string;
  }>;
  points: Point[];
  reflectionPoints: Array<{
    point: Point;
    wallId: string;
  }>;
  isVisible: boolean;
  virtualObjectId: string;
}

export interface RoomNode {
  room: Room;
  children: RoomNode[];
  parent: RoomNode | null;
}

export type StepType = 1 | 2 | 3 | 4 | 5;
export type ReflectionWall = 'top' | 'right' | 'bottom' | 'left';
export type FoldingState = 'unfolded' | 'folding' | 'folded';