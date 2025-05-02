# Reflection Sandbox - System Context and Rules

## Overview
This project implements an educational visualization tool that demonstrates how light reflections and virtual images work.
Users can place objects in a room with mirrored walls and see how these objects appear in virtual reflections.
The system tracks reflections up to multiple orders, correctly placing virtual objects and eventually will trace rays between objects and observers.

## Virtual Reflection System

### 1. Room Tree Generation
- Creates a tree of virtual rooms based on mirror configurations
- Uses path-based IDs that encode the reflection history (e.g., `original-top-1`, `original-top-1-right-2`)
- Each room knows its parent room and which wall it was reflected across
- Handles all reflection orders correctly by recursively applying reflections

### 2. Wall Reflection Logic
- When reflecting across top/bottom walls: top and bottom mirrors swap
- When reflecting across left/right walls: left and right mirrors swap
- This ensures correct mirror placement in all virtual rooms regardless of depth

### 3. Object Placement
- Simple, direct approach that follows the reflection path
- First-order reflections: single reflection transformation
- Higher-order reflections: sequence of transformations following the reflection path
- Each reflection is a simple coordinate flip (x-flip for left/right walls, y-flip for top/bottom)

### 4. Path Tracking
- Traces the full history of reflections from original to virtual room
- Uses this path to properly place virtual objects
- Sets up the foundation for ray tracing between objects and observer

## Core Implementation Details

### Room IDs
Rooms use path-based IDs that encode their reflection history:
- Original room: `original`
- First-order top reflection: `original-top-1`
- Second-order right reflection from first-order top: `original-top-1-right-2`

This approach ensures each room's ID uniquely identifies the sequence of reflections that created it.

### Wall Configuration Transformation
When reflecting a room across walls:
- Top wall reflection: top and bottom walls swap (top↔bottom)
- Right wall reflection: left and right walls swap (left↔right)
- Bottom wall reflection: top and bottom walls swap (top↔bottom)
- Left wall reflection: left and right walls swap (left↔right)

### Object Placement
Objects are placed in virtual rooms by:
1. Tracing the path of reflections from original to virtual room
2. Starting with the original object position
3. Applying each reflection transformation in sequence
4. Simple coordinate flips for each wall reflection:
   - Top/bottom reflection: Flip y-coordinate (`y = roomHeight - y - 1`)
   - Left/right reflection: Flip x-coordinate (`x = roomWidth - x - 1`)

## Design Rules

1. **MAINTAIN PATH-BASED IDs**: Do not change the ID generation system back to position-based IDs.

2. **PRESERVE REFLECTION SEQUENCE**: The current system applies reflections in sequence - do not try to optimize with single-step calculations for higher-order reflections.

3. **KEEP WALL TRANSFORMATION LOGIC**: The wall mirroring logic (top↔bottom, left↔right) is correct and should not be altered.

4. **RESPECT PARENT-CHILD RELATIONSHIPS**: Each virtual room must maintain its parentRoomId and reflectionWall properties.

5. **OBJECT PLACEMENT LOGIC IS FINAL**: The `reflectObjectPosition` and `getReflectionPathWalls` functions implement the core physics - any changes require explicit permission.

## Next Steps
With these foundational elements in place, the system can now move to:
1. Implementing ray tracing between observer and objects
2. Adding the folding animation to show how virtual straight-line paths map to real zigzag paths
3. Creating interactive elements to help learners explore optical principles 