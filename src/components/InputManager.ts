import { ref, onMounted, onBeforeUnmount, Ref } from 'vue';

export interface KeyState {
  w: boolean;
  a: boolean;
  s: boolean;
  d: boolean;
  g: boolean;
  h: boolean;
  p: boolean;
}

export function useInputManager(sceneContainer: Ref<HTMLDivElement | undefined>, isPaused: Ref<boolean>, showHelp: Ref<boolean>, gameStarted: Ref<boolean>, gameOver: Ref<boolean>, onTogglePause: () => void) {
  const keys = ref<KeyState>({ w: false, a: false, s: false, d: false, g: false, h: false, p: false });
  const mouseDown = ref(false);
  const pointerLocked = ref(false);
  
  // Exposed reactive mouse movement for camera control
  const mouseMovementX = ref(0);

  const handleKeyDown = (event: KeyboardEvent) => {
    if (showHelp.value && event.key !== 'Escape') { // Allow Esc to close help
       showHelp.value = false;
       return;
    }
    if (event.key === 'Escape' && pointerLocked.value) {
      document.exitPointerLock();
      return;
    }

    const key = event.key.toLowerCase();

    if (key === 'p' && !keys.value.p && gameStarted.value && !gameOver.value) {
      keys.value.p = true;
      onTogglePause(); 
      return;
    }

    if (isPaused.value) return;

    if (key in keys.value) {
        // Type assertion to allow indexing
       (keys.value as any)[key] = true;
    }
  };

  const handleKeyUp = (event: KeyboardEvent) => {
    const key = event.key.toLowerCase();
    if (key in keys.value) {
       (keys.value as any)[key] = false;
    }
  };

  const handleMouseDown = (event: MouseEvent) => {
    if (showHelp.value || !gameStarted.value || gameOver.value || isPaused.value) return;
    if (event.button === 0) {
      mouseDown.value = true;
      // Request pointer lock on mousedown for better UX
      requestPointerLock(); 
    }
  };

  const handleMouseUp = (event: MouseEvent) => {
    if (event.button === 0) {
      mouseDown.value = false;
    }
  };
  
  const handleMouseMove = (event: MouseEvent) => {
      if (!pointerLocked.value || isPaused.value || !gameStarted.value || gameOver.value) {
         mouseMovementX.value = 0; // Reset movement if not active
         return;
      }
      mouseMovementX.value = event.movementX || (event as any).mozMovementX || (event as any).webkitMovementX || 0;
  };
  
  const handleCanvasClick = () => {
      if (showHelp.value || !gameStarted.value || gameOver.value || isPaused.value) return;
      // Maybe request pointer lock here as a fallback if mousedown fails?
      // requestPointerLock();
  };

  const requestPointerLock = () => {
      if (sceneContainer.value && !pointerLocked.value) {
          sceneContainer.value.requestPointerLock = sceneContainer.value.requestPointerLock ||
                                               (sceneContainer.value as any).mozRequestPointerLock ||
                                               (sceneContainer.value as any).webkitRequestPointerLock;
          if (sceneContainer.value.requestPointerLock) {
              sceneContainer.value.requestPointerLock();
          } else {
              console.warn('浏览器不支持 Pointer Lock API');
          }
      }
  };

  const onPointerLockChange = () => {
    const lockElement = document.pointerLockElement || (document as any).mozPointerLockElement || (document as any).webkitPointerLockElement;
    if (lockElement === sceneContainer.value) {
      pointerLocked.value = true;
      if(sceneContainer.value) sceneContainer.value.style.cursor = 'none';
    } else {
      pointerLocked.value = false;
      if(sceneContainer.value) sceneContainer.value.style.cursor = 'auto';
    }
  };

  const onPointerLockError = (e: Event) => {
    console.error('指针锁定错误:', e);
    pointerLocked.value = false;
    if(sceneContainer.value) sceneContainer.value.style.cursor = 'auto';
  };

  const setupEventListeners = () => {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('pointerlockchange', onPointerLockChange, false);
    document.addEventListener('mozpointerlockchange', onPointerLockChange, false);
    document.addEventListener('webkitpointerlockchange', onPointerLockChange, false);
    document.addEventListener('pointerlockerror', onPointerLockError, false);
    document.addEventListener('mozpointerlockerror', onPointerLockError, false);
    document.addEventListener('webkitpointerlockerror', onPointerLockError, false);
    if (sceneContainer.value) {
       sceneContainer.value.addEventListener('click', handleCanvasClick);
    }
  };

  const removeEventListeners = () => {
    window.removeEventListener('keydown', handleKeyDown);
    window.removeEventListener('keyup', handleKeyUp);
    document.removeEventListener('mousedown', handleMouseDown);
    document.removeEventListener('mouseup', handleMouseUp);
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('pointerlockchange', onPointerLockChange, false);
    document.removeEventListener('mozpointerlockchange', onPointerLockChange, false);
    document.removeEventListener('webkitpointerlockchange', onPointerLockChange, false);
    document.removeEventListener('pointerlockerror', onPointerLockError, false);
    document.removeEventListener('mozpointerlockerror', onPointerLockError, false);
    document.removeEventListener('webkitpointerlockerror', onPointerLockError, false);
     if (sceneContainer.value) {
       sceneContainer.value.removeEventListener('click', handleCanvasClick);
    }
  };

  // Setup on mount, cleanup on unmount
  onMounted(setupEventListeners);
  onBeforeUnmount(removeEventListeners);

  return {
    keys,
    mouseDown,
    pointerLocked,
    mouseMovementX,
    requestPointerLock
  };
} 