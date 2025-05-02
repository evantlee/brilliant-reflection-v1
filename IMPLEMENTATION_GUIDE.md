# Reflection Sandbox - Implementation Guide

## Project Workflow

This document outlines the step-by-step implementation process and key technical considerations.

### 1. Project Setup

```bash
cd ~/Developer/reflection-sandbox
npm create vite@latest . -- --template react-ts
npm install
npm install animejs @types/animejs
```

### 2. Implementation Phases

#### Phase 1: Core Components
- Room grid with togglable mirrored walls
- Object placement
- Observer placement
- Step controls

#### Phase 2: Virtual Room Generation
- First-order reflections
- Virtual object placement
- Higher-order reflections
- Room tree structure

#### Phase 3: Ray Tracing
- Direct line from virtual object to observer
- Reflection point calculation
- Path validation
- Multiple path support

#### Phase 4: Folding Animation
- Wall-based transform origins
- Sequential animation
- Path highlighting
- Interactive folding controls

### 3. Key Technical Challenges

#### Virtual Room Overlap

For higher-order reflections, multiple reflection paths can lead to overlapping virtual rooms. Our approach:

1. Each room maintains its full ancestry path
2. We identify unique reflection sequences
3. We support multiple valid ray paths from observer to object
4. User can select which path to animate/fold

#### Coordinate Systems

We'll handle two coordinate systems:
- **Grid coordinates**: Integer positions within each room (for object placement)
- **World coordinates**: Position in the overall visualization space (for layout and animation)

#### Ray Validation

A ray is only valid if:
1. It passes from a virtual object to the observer
2. It crosses only through mirrored surfaces
3. The path can be folded back to the original room

#### Animation Performance

For complex scenes with many reflections:
1. Use requestAnimationFrame for smooth animations
2. Implement room visibility optimizations (only render visible rooms)
3. For mobile, limit maximum reflection order

### 4. User Interaction Flow

1. **Room Setup**: User places objects and toggles mirrored walls
2. **Reflection Generation**: System shows virtual rooms with virtual objects
3. **Observer Placement**: User places observer outside room
4. **Ray Selection**: User selects a virtual object to trace
5. **Folding Animation**: System demonstrates the light path through folding

### 5. Code Organization

```
src/
├── components/     # UI components
├── hooks/          # Custom React hooks
├── models/         # TypeScript interfaces
├── utils/          # Helper functions
│   ├── roomUtils.ts      # Room generation
│   ├── reflectionUtils.ts # Reflection math
│   ├── rayTracing.ts     # Ray path calculation
│   └── foldingUtils.ts   # Animation helpers
└── App.tsx         # Main application
```

### 6. Testing Strategy

1. **Unit Tests**: Test reflection math and ray tracing algorithms
2. **Integration Tests**: Verify virtual room generation and ray path validations
3. **Visual Tests**: Ensure folding animations correctly represent the physics

### 7. Performance Considerations

- Limit maximum reflection order based on device capability
- Implement lazy rendering for virtual rooms
- Use CSS transforms with hardware acceleration for animations
- Consider using Canvas or WebGL for complex scenes with many reflections

### 8. Extension Points

- Non-rectangular rooms
- Multiple objects
- Different types of reflective surfaces (curved mirrors)
- 3D visualization (moving from 2D grid to 3D space)
- Refraction in addition to reflection