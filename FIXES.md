# Reflection Sandbox - Troubleshooting Fixes

This document outlines the fixes that were applied to address common issues when running the Reflection Sandbox project.

## 404 Error Fixes

The 404 error when accessing the application through `npm run dev` was fixed by:

1. **Moving the index.html file to the root directory**
   - In Vite projects, the index.html file must be in the root directory, not in the public folder.
   - We also fixed the script tag path in index.html to use the correct relative path.

2. **Adding necessary configuration to vite.config.ts**
   - Added proper server configuration
   - Set the base path to './' for relative paths
   - Added resolve aliases to handle imports correctly
   - Set optimizeDeps to include required dependencies

3. **Creating index.ts files for each directory**
   - Added proper exports for components, hooks, and utilities
   - This ensures better module resolution

## Anime.js Import Error Fixes

The error with anime.js imports was fixed by providing multiple implementations:

1. **Import Fixes**
   - Created multiple versions of the useFolding hook with different import strategies
   - Added dynamic imports for anime.js to avoid SSR issues
   - Created a simpler CSS-based animation fallback

2. **Alternative Implementations**
   - `useFolding.ts`: Uses dynamic import of anime.js
   - `useFoldingAlt.ts`: Uses the react-anime library
   - `useFoldingSimple.ts`: Uses plain CSS transitions for compatibility

3. **Dependencies**
   - Added the react-anime package as a fallback option
   - Ensured proper TypeScript types with @types/animejs

## Current Implementation

The application is currently using `useFoldingSimple` to avoid any issues with anime.js imports. This implementation:

1. Uses pure CSS transitions instead of anime.js
2. Has the same API as the original implementation
3. Provides the same functionality but with higher compatibility

If you want to try the original implementation:
- Change the import in App.tsx from `useFoldingSimple` to `useFolding` or `useFoldingAlt`
- Run `npm run clean` before starting the dev server
- Run `npm run dev` to start with a clean cache