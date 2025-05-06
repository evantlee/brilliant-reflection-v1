import React from 'react';
import { OpticsSandboxProvider } from './api';
import SandboxInteractive from './SandboxInteractive';
import './styles.css';

// Configurable inputs
const objectPosition = { x: 1, y: 1 };
const observerPosition = { x: 2, y: 4 }; // just below the room, centered
const mirroredWalls = { top: true, right: true, bottom: false, left: true };
const roomSize = { width: 4, height: 4 };
const reflectionOrderValue = 2; // Configure how many levels of reflections to show

const defaultConfig = {
  room: {
    ...roomSize,
    mirroredWalls,
  },
  object: { position: objectPosition },
  observer: { position: observerPosition },
  reflectionOrder: reflectionOrderValue,
};

const App: React.FC = () => (
  <OpticsSandboxProvider config={defaultConfig}>
    <SandboxInteractive />
  </OpticsSandboxProvider>
);

export default App;
