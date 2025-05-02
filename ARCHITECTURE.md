# Reflection Sandbox - Architecture Guide

## Core Concept

This interactive visualization tool helps learners understand reflections and virtual images by showing how virtual rooms can be created through reflective surfaces. Users will:

1. Place objects in a room with mirrored walls
2. See virtual rooms and objects created by reflections
3. Place an observer and trace rays from virtual objects
4. Fold virtual rooms back to understand the actual light path

## Data Model

### Room
```typescript
interface Room {
  id: string;           // Unique identifier
  width: number;        // Grid width
  height: number;       // Grid height
  walls: {              // Which walls are mirrors
    top: boolean;
    right: boolean;
    bottom: boolean; 
    left: boolean;
  };
  position: Point;      // Position in overall space
  reflectionOrder: number; // 0 for original, 1+ for virtual
  reflectionWall?: 'top' | 'right' | 'bottom' | 'left'; // Reflection surface
  parentRoomId?: string; // Reference to source room
}
```

### Object
```typescript
interface PlacedObject {
  id: string;
  position: Point;     // Grid position
  isVirtual: boolean;  // Original or virtual
  roomId: string;      // Which room it belongs to
}
```

### Observer
```typescript
interface Observer {
  position: Point;
}
```

### Ray Path
```typescript
interface RayPath {
  points: Point[];     // Series of points forming the path
  reflectionPoints: {  // Points where reflections occur
    point: Point;
    wallId: string;    // Format: "roomId-wall"
  }[];
  virtualObjectId: string; // Which virtual object this ray comes from
}
```

## Room Tree Structure

For handling higher-order reflections with overlapping virtual rooms, we'll maintain a tree structure:

```typescript
interface RoomNode {
  room: Room;
  children: RoomNode[];
  parent: RoomNode | null;
}
```

This allows us to:
1. Track the ancestry of each virtual room
2. Follow multiple possible paths from virtual rooms back to the original
3. Handle cases where different reflection sequences lead to overlapping virtual rooms

## Reflection Coordinate Mapping

When generating virtual rooms, we'll map coordinates from the source room to the virtual room using these transformations:

- Top reflection: `(x, y) -> (x, -y)`
- Right reflection: `(x, y) -> (2*width - x, y)`
- Bottom reflection: `(x, y) -> (x, 2*height - y)`
- Left reflection: `(x, y) -> (-x, y)`

These transformations are applied relative to the reflection boundary, and multiple transformations will be composed for higher-order reflections.

## Ray Tracing Strategy

1. Start with a straight line from virtual object to observer
2. Identify which room boundaries the ray passes through
3. For each boundary, calculate the reflection point
4. Verify the ray's validity (passes through mirrors correctly)
5. Follow the room tree back to the original room

## Folding Animation

Folding occurs by:
1. Setting transform-origin to the reflection boundary
2. Applying rotation transforms (rotateX or rotateY)
3. Following the room tree to fold rooms sequentially
4. Ending with the real path of light within the original room

The folding animation will be a key educational component, showing how the virtual straight-line path folds into the actual zigzag light path through reflections.