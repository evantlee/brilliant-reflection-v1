import { useState, useRef, useEffect } from 'react';
import { Room, RayPath, FoldingState } from '../models/types';
import { 
  calculateTransformOrigin, 
  getRotationForWall, 
  getFoldingSequence 
} from '../utils/foldingUtils';

// Import types but handle the actual import dynamically
// import type * as AnimeType from 'animejs';
// type AnimeInstance = typeof AnimeType;

interface UseFoldingOptions {
  duration?: number;
  easing?: string;
  delay?: number;
}

export const useFolding = (
  rayPath: RayPath | null,
  rooms: Room[],
  originalRoomId: string,
  options: UseFoldingOptions = {}
) => {
  const { 
    duration = 1000, 
    easing = 'easeOutQuad', 
    delay = 500 
  } = options;
  
  // Store anime.js module
  const [anime, setAnime] = useState<any>(null);
  
  // Load anime.js dynamically
  useEffect(() => {
    const loadAnime = async () => {
      try {
        // Use dynamic import
        const animeModule = await import('animejs');
        setAnime(animeModule.default || animeModule);
      } catch (e) {
        console.error('Failed to load anime.js:', e);
      }
    };
    
    loadAnime();
  }, []);
  
  // Folding state
  const [foldingState, setFoldingState] = useState<FoldingState>('unfolded');
  
  // References to room DOM elements
  const roomRefs = useRef<Map<string, HTMLElement>>(new Map());
  
  // Folding sequence
  const [foldingSequence, setFoldingSequence] = useState<{
    room: Room;
    wall: 'top' | 'right' | 'bottom' | 'left';
  }[]>([]);
  
  // Animation timeline
  const animationRef = useRef<any>(null);
  
  // Update folding sequence when ray path changes
  useEffect(() => {
    if (rayPath) {
      const sequence = getFoldingSequence(rayPath, rooms, originalRoomId);
      setFoldingSequence(sequence);
    } else {
      setFoldingSequence([]);
    }
  }, [rayPath, rooms, originalRoomId]);
  
  // Register a room element
  const registerRoomRef = (roomId: string, element: HTMLElement | null) => {
    if (element) {
      roomRefs.current.set(roomId, element);
    } else {
      roomRefs.current.delete(roomId);
    }
  };
  
  // Start folding animation
  const startFolding = () => {
    if (!anime || !rayPath || foldingSequence.length === 0 || foldingState !== 'unfolded') {
      return;
    }
    
    setFoldingState('folding');
    
    // Create animation timeline
    const timeline = anime.timeline({
      easing,
      complete: () => {
        setFoldingState('folded');
      }
    });
    
    // Add animations for each step in sequence
    foldingSequence.forEach((step, index) => {
      const { room, wall } = step;
      const element = roomRefs.current.get(room.id);
      
      if (!element) return;
      
      const transformOrigin = calculateTransformOrigin(room, wall);
      const { property, value } = getRotationForWall(wall);
      
      timeline.add({
        targets: element,
        [property]: value,
        duration,
        delay: index === 0 ? delay : 0,
        easing,
        transformOrigin
      }, index === 0 ? 0 : '+=200');
    });
    
    animationRef.current = timeline;
  };
  
  // Reset folding animation
  const resetFolding = () => {
    if (!anime || foldingState === 'unfolded') return;
    
    // Stop any ongoing animation
    if (animationRef.current) {
      animationRef.current.pause();
    }
    
    // Reset all room transforms
    roomRefs.current.forEach((element) => {
      anime({
        targets: element,
        rotateX: 0,
        rotateY: 0,
        duration: 500,
        easing,
        transformOrigin: '50% 50%'
      });
    });
    
    setFoldingState('unfolded');
    animationRef.current = null;
  };
  
  return {
    foldingState,
    registerRoomRef,
    startFolding,
    resetFolding
  };
};

export default useFolding;