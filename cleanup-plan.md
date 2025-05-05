# Reflection Sandbox Cleanup Plan

Based on a code review, here are suggestions to clean up redundant or unused code now that we've implemented the simplified ray tracing approach.

## Files to Consider Removing

1. **`src/components/DraggableRayPath.tsx`**
   - No imports found for this component in the codebase
   - Replaced by the simpler `SimpleRayPath.tsx` implementation

2. **`src/components/RayPath.tsx`**
   - Redundant with our new `SimpleRayPath.tsx` implementation
   - Still appears in imports, but could be removed if not actively used

3. **`src/components/VirtualRoomFolding.tsx` & `src/components/VirtualRoomFolding.css`**
   - No imports found for this component
   - Likely related to a more complex folding animation that isn't part of the simplified approach

## Code to Consider Cleaning Up

1. **In `src/components/index.ts`**
   - Remove exports for any components we decide to delete

2. **In `src/utils` folder**
   - The `geometry.ts` utilities could be simplified to only keep functions used by SimpleRayPath
   - Some complex reflection utilities in `reflectionUtils.ts` may no longer be needed

3. **In `src/hooks` folder**
   - `useRayTracing.ts` might be redundant as we're handling ray tracing directly in the SimpleRayPath component

## Steps to Clean Up

1. First, verify that the click functionality is working properly with the fixed code
2. Then, remove one file at a time, testing after each removal to ensure nothing breaks
3. Start with the least connected files (likely DraggableRayPath.tsx)
4. Update imports/exports as needed
5. Simplify utility functions to only what's needed for the current implementation

## Benefits

- Smaller, more maintainable codebase
- Clearer code organization focused on the simplified approach
- Better performance due to less unused code
- Easier onboarding for new developers

## Note

Before removing any code, make sure to commit the current working state so you can roll back if needed. 