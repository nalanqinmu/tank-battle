import * as THREE from 'three';
import { ref, Ref } from 'vue';

export function useSceneManager(sceneContainer: Ref<HTMLDivElement | undefined>) {
  const scene = new THREE.Scene();
  const camera = ref<THREE.PerspectiveCamera | null>(null);
  const renderer = ref<THREE.WebGLRenderer | null>(null);

  const initSceneEssentials = () => {
    if (!sceneContainer.value) throw new Error('Scene container not available');

    scene.background = new THREE.Color(0x87CEEB);
    scene.fog = new THREE.FogExp2(0x87CEEB, 0.01);

    // 创建相机
    const aspect = window.innerWidth / window.innerHeight;
    camera.value = new THREE.PerspectiveCamera(60, aspect, 0.1, 1000);

    // 创建渲染器
    renderer.value = new THREE.WebGLRenderer({
      antialias: true,
      canvas: document.createElement('canvas')
    });
    renderer.value.setSize(window.innerWidth, window.innerHeight);
    renderer.value.setClearColor(0x87CEEB, 1);
    // Basic shadow map settings
    renderer.value.shadowMap.enabled = true;
    renderer.value.shadowMap.type = THREE.PCFSoftShadowMap; 

    // 添加到DOM
    sceneContainer.value.innerHTML = '';
    sceneContainer.value.appendChild(renderer.value.domElement);

    // 添加灯光
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.0);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(50, 100, 50);
    directionalLight.castShadow = true;
    // Configure shadow properties for directional light
    directionalLight.shadow.mapSize.width = 2048; // default
    directionalLight.shadow.mapSize.height = 2048; // default
    directionalLight.shadow.camera.near = 0.5; // default
    directionalLight.shadow.camera.far = 500; // default
    directionalLight.shadow.camera.left = -50;
    directionalLight.shadow.camera.right = 50;
    directionalLight.shadow.camera.top = 50;
    directionalLight.shadow.camera.bottom = -50;
    scene.add(directionalLight);

    window.addEventListener('resize', onWindowResize);
  };

  const onWindowResize = () => {
    if (!camera.value || !renderer.value) return;
    camera.value.aspect = window.innerWidth / window.innerHeight;
    camera.value.updateProjectionMatrix();
    renderer.value.setSize(window.innerWidth, window.innerHeight);
  };

  const cleanup = () => {
    window.removeEventListener('resize', onWindowResize);
    if (renderer.value) {
      renderer.value.dispose();
    }
    if(sceneContainer.value && renderer.value) {
        try {
             sceneContainer.value.removeChild(renderer.value.domElement);
        } catch (e) {
             console.warn('Error removing renderer DOM element:', e)
        }
    }
    // Scene cleanup is handled by the main component for now
    // Consider adding geometry/material disposal here if SceneManager owns them
  };

  return {
    scene,
    camera,
    renderer,
    initSceneEssentials,
    onWindowResize, // Expose for potential manual trigger
    cleanup
  };
} 