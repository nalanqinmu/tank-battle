<template>
  <div ref="sceneContainer" class="scene-container"></div>
  
  <div class="game-info">
    <div class="score">得分: {{ score }}</div>
    <div class="health-container">
      <div class="health-label">生命值: {{ health }}</div>
      <div class="health-bar-bg">
        <div class="health-bar" :style="{ width: `${health}%` }"></div>
      </div>
    </div>
  </div>
  
  <div class="controls-info">
    <h3>控制方式</h3>
    <p>
      <span :class="{ 'key-active': keys.w }">W</span>/
      <span :class="{ 'key-active': keys.s }">S</span>: 前进/后退
    </p>
    <p>
      <span :class="{ 'key-active': keys.a }">A</span>/
      <span :class="{ 'key-active': keys.d }">D</span>: 左转/右转
    </p>
    <p>
      <span :class="{ 'key-active': mouseDown }">鼠标左键</span>: 射击
    </p>
    <p>
      <span>鼠标移动</span>: 控制视角
    </p>
    <p>
      <span :class="{ 'key-active': keys.g }">G</span>: 切换网格显示
    </p>
    <p>
      <span :class="{ 'key-active': keys.h }">H</span>: 查看帮助
    </p>
    <p>
      <span :class="{ 'key-active': keys.p }">P</span>: 暂停/继续
    </p>
    <p class="tip">利用掩体躲避敌人攻击</p>
    <p class="tip">点击屏幕锁定鼠标并射击</p>
  </div>
  
  <!-- 分数增加动画 -->
  <transition name="score-change">
    <div v-if="showScoreDelta" class="score-delta">+{{ scoreDelta }}</div>
  </transition>
  
  <!-- WebGL不支持提示 -->
  <div v-if="!webGLSupported" class="webgl-error">
    <h2>WebGL不受支持</h2>
    <p>您的浏览器不支持WebGL，无法运行游戏。</p>
    <p>请尝试使用Chrome、Firefox或Edge浏览器。</p>
  </div>
  
  <!-- 游戏开始界面 -->
  <div v-if="!gameStarted && !gameOver && webGLSupported" class="game-start">
    <h1>坦克战斗</h1>
    <p class="game-description">驾驶坦克与敌人作战，消灭敌方坦克获取高分！</p>
    <button @click="startGame" class="start-button">开始游戏</button>
    <p class="tip">使用WASD移动，鼠标左键射击</p>
  </div>
  
  <!-- 游戏结束界面 -->
  <div v-if="gameOver" class="game-over">
    <h2>游戏结束</h2>
    <p class="final-score">最终得分: <span>{{ score }}</span></p>
    <p class="game-over-msg">您的坦克被敌军摧毁了!</p>
    <button @click="restartGame">再来一局</button>
  </div>
  
  <!-- 帮助按钮 -->
  <div class="help-button" @click="showHelp = !showHelp">
    <span>?</span>
  </div>
  
  <!-- 游戏操作说明 -->
  <div v-if="showHelp" class="help-panel">
    <div class="help-header">
      <h2>坦克战斗 - 操作指南</h2>
      <button class="close-btn" @click="showHelp = false">×</button>
    </div>
    <div class="help-content">
      <div class="help-section">
        <h3>游戏目标</h3>
        <p>消灭敌方坦克并获得高分，同时保护自己的坦克不被摧毁。</p>
      </div>
      
      <div class="help-section">
        <h3>基本操作</h3>
        <ul>
          <li><strong>移动：</strong> W(前进)、S(后退)、A(左转)、D(右转)</li>
          <li><strong>射击：</strong> 鼠标左键点击或按住</li>
          <li><strong>视角控制：</strong> 移动鼠标（仅水平）调整视角 (需点击屏幕锁定指针，按 ESC 键释放)</li>
          <li><strong>网格显示：</strong> G键 - 切换地面网格显示</li>
          <li><strong>帮助显示：</strong> H键 - 切换此帮助面板</li>
          <li><strong>暂停/继续：</strong> P键 - 切换游戏暂停状态</li>
        </ul>
      </div>
      
      <div class="help-section">
        <h3>游戏技巧</h3>
        <ul>
          <li>点击游戏界面锁定鼠标指针，以启用鼠标视角控制</li>
          <li>利用掩体躲避敌人攻击，避免被多个敌人同时瞄准</li>
          <li>当血量低时，寻找掩护并保持距离</li>
          <li>射击敌人可以获得分数，摧毁敌人坦克获得更多分数</li>
          <li>熟练运用鼠标控制视角，观察周围环境</li>
          <li>当被敌人坦克包围时，快速转向并寻找突破口</li>
        </ul>
      </div>
      
      <div class="help-section">
        <h3>游戏元素</h3>
        <ul>
          <li><strong>绿色坦克：</strong> 玩家控制的坦克</li>
          <li><strong>红色坦克：</strong> 敌方坦克，会追踪并攻击玩家</li>
          <li><strong>棕色方块：</strong> 掩体，可以阻挡子弹和坦克移动</li>
          <li><strong>红色球体：</strong> 子弹，击中目标会造成伤害</li>
        </ul>
      </div>
    </div>
  </div>
  
  <!-- 暂停游戏提示 -->
  <div v-if="isPaused && gameStarted && !gameOver" class="pause-overlay">
    <h2>游戏已暂停</h2>
    <p>按 P 键继续游戏</p>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch, Ref } from 'vue'; // Added Ref
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { Bullet } from './Bullet';
import { EnemyTank } from './EnemyTank'; // Ensure this type includes health, lastShootTime, etc.

// Import Managers
import { useSceneManager } from './SceneManager';
import { usePhysicsManager } from './PhysicsManager';
import { useInputManager, KeyState } from './InputManager'; // Import KeyState

// --- Define Temporary Enemy Interface ---
interface EnemyData {
  mesh: any; // Can be InstancedMesh info or THREE.Object3D
  body: CANNON.Body;
  health: number;
  lastShootTime: number;
}

// --- Game State Refs ---
const score = ref(0);
const health = ref(100);
const gameOver = ref(false);
const webGLSupported = ref(true);
const showGrid = ref(false);
const showHelp = ref(true);
const gameStarted = ref(false);
const isPaused = ref(false);
const showScoreDelta = ref(false);
const scoreDelta = ref(0);

// --- Camera Control Params ---
const cameraAngleH = ref(0);
const cameraAngleV = ref(Math.PI / 6);
const mouseSensitivity = 0.002;
const followDistance = 10;
const cameraLerpFactor = 0.1;

// --- Scene Container Ref ---
const sceneContainer = ref<HTMLDivElement>();

// --- Core Managers ---
const sceneManager = useSceneManager(sceneContainer);
const physicsManager = usePhysicsManager();
const inputManager = useInputManager(
  sceneContainer, 
  isPaused, 
  showHelp, 
  gameStarted, 
  gameOver, 
  togglePause // Pass togglePause function
);

// Destructure frequently used manager properties/refs
const { scene, camera, renderer } = sceneManager;
const { world } = physicsManager;
const { keys, mouseDown, pointerLocked, mouseMovementX, requestPointerLock } = inputManager;

// --- Game Object Refs & Variables ---
let tank: THREE.Object3D | null = null;
let tankBody: CANNON.Body | null = null;
let bullets: Bullet[] = [];
let enemyBullets: Bullet[] = [];
let enemies: EnemyData[] = []; // Use the temporary interface
let obstacles: { mesh: THREE.Object3D, body: CANNON.Body }[] = [];
let lastTime = 0;
let enemySpawnTimer = 0;
let animationFrameId: number | null = null;
let enemyInstancedMesh: THREE.InstancedMesh | null = null;

// --- Sound Objects ---
let shootSound: HTMLAudioElement | null = null;
let explosionSound: HTMLAudioElement | null = null;
let hitSound: HTMLAudioElement | null = null;
let engineSound: HTMLAudioElement | null = null;

// --- Constants & Shoot Timer ---
const shootInterval = 0.3; // s
const lastShootTime = ref(0); // Use ref for reactive tracking

// --- WebGL Support Check ---
const checkWebGLSupport = (): boolean => {
  try {
    const canvas = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && 
      (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
  } catch (e) {
    console.error('WebGL检测错误:', e);
    return false;
  }
};

// --- Ground & Grid Helper ---
const createGroundAndGrid = () => {
  const textureLoader = new THREE.TextureLoader();
    textureLoader.load('/textures/sand_dunes.jpg', (texture) => {
      texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(10, 10);
      const groundGeometry = new THREE.PlaneGeometry(100, 100, 1, 1);
    const groundMaterial = new THREE.MeshStandardMaterial({ map: texture, side: THREE.DoubleSide });
    const groundMesh = new THREE.Mesh(groundGeometry, groundMaterial);
    groundMesh.rotation.x = -Math.PI / 2;
    groundMesh.position.y = -0.01;
    groundMesh.receiveShadow = true; // Ground should receive shadows
    scene.add(groundMesh);
    }, undefined, (err) => {
      console.warn('无法加载地形纹理，使用基本平面:', err);
      const groundGeometry = new THREE.PlaneGeometry(100, 100, 1, 1);
    const groundMaterial = new THREE.MeshBasicMaterial({ color: 0x1a5c1a, transparent: true, opacity: 0.7, side: THREE.DoubleSide });
    const groundMesh = new THREE.Mesh(groundGeometry, groundMaterial);
    groundMesh.rotation.x = -Math.PI / 2;
    groundMesh.position.y = -0.01;
    scene.add(groundMesh);
  });

      const gridHelper = new THREE.GridHelper(100, 100, 0x666666, 0xAAAAAA);
  gridHelper.position.y = 0.01;
  (gridHelper.material as THREE.Material).opacity = 0.25;
  (gridHelper.material as THREE.Material).transparent = true;
  gridHelper.visible = showGrid.value;
      scene.add(gridHelper);
};

// --- Player Tank Creation ---
const createPlayerTank = () => {
  const textureLoader = new THREE.TextureLoader();
    textureLoader.load('/textures/tank_texture.png', (texture) => {
    texture.anisotropy = renderer.value?.capabilities.getMaxAnisotropy() || 16;
      const tankGeometry = new THREE.BoxGeometry(1.5, 0.8, 2.5);
    const tankMaterial = new THREE.MeshStandardMaterial({ map: texture, metalness: 0.7, roughness: 0.3 });
      tank = new THREE.Mesh(tankGeometry, tankMaterial);
      tank.position.set(0, 0.8, 0);
    tank.castShadow = true; // Tank should cast shadows
      scene.add(tank);
    }, undefined, (err) => {
      console.warn('无法加载玩家坦克纹理，使用基本模型:', err);
      const tankGeometry = new THREE.BoxGeometry(1.5, 0.8, 2.5);
    const tankMaterial = new THREE.MeshBasicMaterial({ color: 0x44ff44, wireframe: false });
      tank = new THREE.Mesh(tankGeometry, tankMaterial);
      tank.position.set(0, 0.8, 0);
    tank.castShadow = true;
      scene.add(tank);
    });

  // 创建坦克专用材质
  const tankMaterial = new CANNON.Material('tank');
  
  // 增加质量使坦克更稳定，并增加damping
  tankBody = new CANNON.Body({
    mass: 20, // 增加质量从5到20
    position: new CANNON.Vec3(0, 0.8, 0),
    shape: new CANNON.Box(new CANNON.Vec3(0.75, 0.4, 1.25)),
    linearDamping: 0.9, // 增加阻尼从0.5到0.9
    angularDamping: 0.9, // 增加阻尼从0.5到0.9
    fixedRotation: true, // 禁止沿着x和z轴旋转
    material: tankMaterial // 使用tank材质
  });
  
  // 禁止沿y轴以外的旋转
  tankBody.angularFactor.set(0, 1, 0);
  world.addBody(tankBody);
};

// --- Sound Initialization ---
const initSounds = () => {
  try {
    shootSound = new Audio('/sounds/shoot.mp3');
    shootSound.volume = 0.4;
    explosionSound = new Audio('/sounds/explosion.mp3');
    explosionSound.volume = 0.6;
    hitSound = new Audio('/sounds/hit.mp3');
    hitSound.volume = 0.3;
    engineSound = new Audio('/sounds/engine.mp3');
    engineSound.volume = 0.2;
    engineSound.loop = true;
    console.log('声音系统初始化成功');
  } catch (e) {
    console.warn('声音系统初始化失败:', e);
  }
};

// --- Play Sound Utility ---
const playSound = (sound: HTMLAudioElement | null) => {
  if (!sound) return;
  try {
    const soundClone = sound.cloneNode() as HTMLAudioElement;
    soundClone.volume = sound.volume; // Ensure clone has same volume
    soundClone.play().catch(e => console.warn('播放声音失败:', e));
  } catch (e) {
    console.warn('播放声音出错:', e);
  }
};

// --- Obstacle Loading --- (Keep this part for now)
const loadObstacleModels = (): Promise<void[]> => {
  console.log('跳过模型加载，直接使用基本几何体');
  // 返回一个立即解析的Promise
  return Promise.resolve([]);
};

// --- Grid Helper Visibility ---
watch(showGrid, (newValue) => {
  scene.traverse((obj) => {
    if (obj instanceof THREE.GridHelper) {
      obj.visible = newValue;
    }
  });
});

// --- Pause Toggle --- (Passed to InputManager)
function togglePause() {
  isPaused.value = !isPaused.value;
  console.log('游戏暂停状态:', isPaused.value);
  if (isPaused.value) {
    if (pointerLocked.value) {
      document.exitPointerLock();
    }
    engineSound?.pause();
  } else {
    lastTime = performance.now(); // Reset time to avoid large deltaTime jump
    if (animationFrameId === null) {
         animationFrameId = requestAnimationFrame(animate);
    }
    engineSound?.play().catch(e => console.warn('恢复引擎声音播放失败:', e));
  }
}

// --- Bullet Firing ---
const fireSimpleBullet = () => {
  if (!tank || !tankBody || !gameStarted.value || gameOver.value || isPaused.value) return;

  const tankQuaternion = tankBody.quaternion as unknown as THREE.Quaternion;
  const bulletDirection = new THREE.Vector3(0, 0, 1).applyQuaternion(tankQuaternion).normalize();
  const muzzleOffset = new THREE.Vector3(0, 0.5, 1.5); // 相对于坦克的偏移量
  
  // 计算物理引擎中的子弹位置
  const muzzleOffsetCannon = new CANNON.Vec3(muzzleOffset.x, muzzleOffset.y, muzzleOffset.z);
  const worldOffset = new CANNON.Vec3();
  tankBody.quaternion.vmult(muzzleOffsetCannon, worldOffset);
  
  // 克隆位置并添加偏移量
  const bulletPositionCannon = new CANNON.Vec3();
  tankBody.position.vadd(worldOffset, bulletPositionCannon);
  
  // 正确地将CANNON.Vec3转换为THREE.Vector3
  const bulletPosition = new THREE.Vector3(
    bulletPositionCannon.x,
    bulletPositionCannon.y,
    bulletPositionCannon.z
  );

  // 创建子弹
  const bullet = new Bullet(scene, world, bulletPosition, bulletDirection);
  bullets.push(bullet);

  createMuzzleFlash(bulletPosition, bulletDirection); 
  playSound(shootSound);
};

// --- Tank Movement (Using Physics) ---
const updateSimpleTankMovement = () => {
  if (!tankBody || isPaused.value) return;

  const moveSpeed = 5; // Adjust as needed
  const rotateSpeed = 1.5; // Adjust as needed

  const forward = new CANNON.Vec3(0, 0, 1);
  tankBody.quaternion.vmult(forward, forward); // Get world forward direction

  let force = new CANNON.Vec3(0, 0, 0);
  let torque = new CANNON.Vec3(0, 0, 0);

  // --- Calculate Force --- 
  const forceDirectionW = new CANNON.Vec3(); 
  forward.scale(moveSpeed, forceDirectionW); // Scale into the new vector
  const forceDirectionS = new CANNON.Vec3();
  forward.scale(-moveSpeed, forceDirectionS); // Scale into the new vector

  if (keys.value.w) {
      force.vadd(forceDirectionW, force);
  }
  if (keys.value.s) {
      force.vadd(forceDirectionS, force);
  }
  
  // --- 直接设置水平速度，保持垂直速度为零 --- 
  tankBody.velocity.x = force.x;
  tankBody.velocity.z = force.z;
  // 防止垂直运动
  tankBody.velocity.y = 0; 

  // --- Calculate Torque --- 
  if (keys.value.a) {
      torque.y = rotateSpeed;
  }
  if (keys.value.d) {
      torque.y = -rotateSpeed;
  }
  
  // --- 只设置y轴旋转 ---
  tankBody.angularVelocity.y = torque.y;
  tankBody.angularVelocity.x = 0; // 防止倾斜
  tankBody.angularVelocity.z = 0; // 防止倾斜

  // 同步模型位置和旋转
  if (tank) {
    tank.position.set(
      tankBody.position.x,
      tankBody.position.y,
      tankBody.position.z
    );
    tank.quaternion.set(
      tankBody.quaternion.x,
      tankBody.quaternion.y,
      tankBody.quaternion.z,
      tankBody.quaternion.w
    );
  }
};

// --- Animation Loop ---
const animate = () => {
  if (gameOver.value || !gameStarted.value) {
      animationFrameId = null; // Ensure loop stops
      return;
  }
  
  if (isPaused.value) {
    animationFrameId = requestAnimationFrame(animate); // Keep requesting frames even when paused
    return;
  }

  animationFrameId = requestAnimationFrame(animate);

  const currentTime = performance.now();
  let deltaTime = (currentTime - lastTime) / 1000;
  deltaTime = Math.min(deltaTime, 0.1); // Clamp deltaTime
  lastTime = currentTime;

  try {
    physicsManager.update(deltaTime); // Update physics first
    
    // 确保坦克高度保持稳定
    if (tankBody) {
      // 锁定坦克高度，防止跳动
      tankBody.position.y = 0.8;
      tankBody.velocity.y = 0; // 不允许垂直速度
    }
    
    updateSimpleTankMovement(); // Update player based on input
    updateCamera(); // Update camera based on player and input
    updateEnemies(deltaTime); // Update enemy AI
    updateBullets(deltaTime); // Update bullet movement and checks
    // checkCollisions(); // Manual collision checks (mostly replaced by physics events/updates)
    updateContinuousShooting(deltaTime);

    if (renderer.value && camera.value) { // Check both refs
       renderer.value.render(scene, camera.value); 
    } else {
       console.warn("Renderer or Camera not ready during animate loop");
    }
  } catch (e) {
    console.error('渲染错误:', e);
  }
};

// --- Continuous Shooting ---
const updateContinuousShooting = (deltaTime: number) => {
  if (!gameStarted.value || gameOver.value || isPaused.value || !mouseDown.value) return;

   const now = performance.now() / 1000;
   if (now - lastShootTime.value > shootInterval) { 
      fireSimpleBullet();
      lastShootTime.value = now; // Update the ref value
   }
};

// --- Game Over & Restart ---
const endGame = () => {
  gameOver.value = true;
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }
  engineSound?.pause();
};

const restartGame = () => {
  score.value = 0;
  health.value = 100;
  gameOver.value = false;
  gameStarted.value = true;
  isPaused.value = false;

  // Clear bullets
  bullets.forEach(bullet => bullet.destroy(scene, world));
  bullets = [];
  enemyBullets.forEach(bullet => bullet.destroy(scene, world));
  enemyBullets = [];

  // Clear enemies
  enemies.forEach(enemy => {
    if (!(enemy.mesh as any).isInstancedMesh && enemy.mesh instanceof THREE.Object3D) {
      scene.remove(enemy.mesh);
    } else if (enemyInstancedMesh && (enemy.mesh as any).isInstancedMesh) {
       try {
         const matrix = new THREE.Matrix4().makeScale(0, 0, 0);
         enemyInstancedMesh.setMatrixAt((enemy.mesh as any).instanceId, matrix);
       } catch (error) { console.error("Error hiding instance:", error); }
    }
    if(enemy.body) world.removeBody(enemy.body);
  });
  enemies = [];
  if(enemyInstancedMesh) {
      enemyInstancedMesh.count = 0;
      enemyInstancedMesh.instanceMatrix.needsUpdate = true;
  }

  // Clear obstacles
  obstacles.forEach(obstacle => {
    scene.remove(obstacle.mesh);
    if(obstacle.body) world.removeBody(obstacle.body);
  });
  obstacles = [];

  // Reset tank position
  if (tank && tankBody) {
    tankBody.position.set(0, 0.8, 0);
    tankBody.quaternion.set(0, 0, 0, 1);
    tankBody.velocity.set(0, 0, 0);
    tankBody.angularVelocity.set(0, 0, 0);
    tank.position.set(
      tankBody.position.x,
      tankBody.position.y,
      tankBody.position.z
    );
    tank.quaternion.set(
      tankBody.quaternion.x,
      tankBody.quaternion.y,
      tankBody.quaternion.z,
      tankBody.quaternion.w
    );
  }

  createObstacles(20); // Recreate obstacles
  enemySpawnTimer = 3;
  lastTime = performance.now();
  
  engineSound?.play().catch(e => console.warn('引擎声音播放失败:', e));
  animate(); // Restart animation loop
};

// --- Enemy System --- 
const initializeEnemySystem = () => { 
    if (!renderer.value) { 
        console.error("Renderer not available for enemy system init");
        return null;
    }
    const maxAnisotropy = renderer.value.capabilities.getMaxAnisotropy();

    const enemyGeometry = new THREE.BoxGeometry(1.5, 0.8, 2.5);
    const defaultMaterial = new THREE.MeshStandardMaterial({
        color: 0xff4444, 
        metalness: 0.6, 
        roughness: 0.4
    });
    const maxEnemies = 10; // Define max instances
    enemyInstancedMesh = new THREE.InstancedMesh(enemyGeometry, defaultMaterial, maxEnemies);
    enemyInstancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    enemyInstancedMesh.count = 0;
    enemyInstancedMesh.castShadow = true;
    enemyInstancedMesh.receiveShadow = true;
    scene.add(enemyInstancedMesh);
    enemyInstancedMesh.frustumCulled = false; // Important for instanced meshes

    const textureLoader = new THREE.TextureLoader();
    textureLoader.load('/textures/enemy_tank.png', (texture) => {
        texture.anisotropy = maxAnisotropy;
        const texturedMaterial = new THREE.MeshStandardMaterial({
            map: texture,
            metalness: 0.7,
            roughness: 0.3
        });
        if(enemyInstancedMesh) enemyInstancedMesh.material = texturedMaterial;
    }, undefined, (err) => {
        console.warn('敌方坦克纹理加载失败，保持默认材质:', err);
    });

    return enemyInstancedMesh;
};

const spawnEnemy = () => { 
    const maxEnemies = 10; // Use the same constant or get from mesh if possible
    if (enemies.length >= 5 || !enemyInstancedMesh || enemyInstancedMesh.count >= maxEnemies) { // Check against maxEnemies
        if(enemyInstancedMesh && enemyInstancedMesh.count >= maxEnemies) {
             console.warn('Max enemy instances reached, cannot spawn more.');
        }
        return;
    }
    const angle = Math.random() * Math.PI * 2;
    const distance = 20 + Math.random() * 15;
    const x = Math.cos(angle) * distance;
    const z = Math.sin(angle) * distance;
  
    let enemyMeshRepresentation: any;
    let spawnedWithInstance = false;
  
    // Use maxEnemies defined above for the check
    if (enemyInstancedMesh.count < maxEnemies) { 
        const instanceId = enemyInstancedMesh.count;
        const matrix = new THREE.Matrix4();
        const position = new THREE.Vector3(x, 0.8, z);
        const quaternion = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.random() * Math.PI * 2, 0));
        matrix.compose(position, quaternion, new THREE.Vector3(1,1,1));
        enemyInstancedMesh.setMatrixAt(instanceId, matrix);
        enemyInstancedMesh.count++;
        enemyInstancedMesh.instanceMatrix.needsUpdate = true;
        spawnedWithInstance = true;
        
        enemyMeshRepresentation = {
            isInstancedMesh: true,
            instanceId: instanceId,
            position: position.clone(), 
            quaternion: quaternion.clone()
        };
    } 
    // Removed the else block for fallback mesh creation as instance check prevents it

    const enemyBody = new CANNON.Body({
        mass: 5,
        position: new CANNON.Vec3(x, 0.8, z),
        shape: new CANNON.Box(new CANNON.Vec3(0.75, 0.4, 1.25)),
        linearDamping: 0.4,
        angularDamping: 0.4
    });
    (enemyBody as any).userData = { isEnemy: true };
    world.addBody(enemyBody);

    // Use the EnemyData interface for the new enemy object
    const newEnemy: EnemyData = {
        mesh: enemyMeshRepresentation, 
        body: enemyBody,
        health: 100, 
        lastShootTime: 0 
    };
    enemies.push(newEnemy);
    console.log('生成敌人，当前敌人数量:', enemies.length);
 };

const updateEnemies = (deltaTime: number) => { 
    enemySpawnTimer -= deltaTime;
    if (enemySpawnTimer <= 0 && enemies.length < 5) {
        spawnEnemy();
        enemySpawnTimer = 3 + Math.random() * 2;
    }

    let instanceMatrixNeedsUpdate = false;

    for (let index = enemies.length - 1; index >= 0; index--) {
        const enemy = enemies[index];
        if (!tankBody || !enemy.body) continue; // Check tankBody

        // Health check
        if (enemy.health <= 0) {
            // 正确地将CANNON.Vec3转换为THREE.Vector3
            const explosionPosition = new THREE.Vector3(
                enemy.body.position.x,
                enemy.body.position.y,
                enemy.body.position.z
            );
            createExplosion(explosionPosition);
            playSound(explosionSound);
            
            if ((enemy.mesh as any).isInstancedMesh && enemyInstancedMesh) {
                 try {
                     const matrix = new THREE.Matrix4().makeScale(0, 0, 0);
                     // Use a safe default ID if instanceId is missing somehow
                     const instanceId = (enemy.mesh as any).instanceId ?? -1; 
                     if (instanceId >= 0 && instanceId < enemyInstancedMesh.count) { 
                         enemyInstancedMesh.setMatrixAt(instanceId, matrix);
                         instanceMatrixNeedsUpdate = true;
                         // Optional: Consider swapping with the last active instance for faster removal
                         // This involves updating IDs and matrices.
                     }
                 } catch (error) { console.error("Error hiding instance:", error); }
            } else if (enemy.mesh instanceof THREE.Object3D) { // Handle non-instanced fallback (if ever used)
                scene.remove(enemy.mesh);
            } 
            
            world.removeBody(enemy.body);
            enemies.splice(index, 1);
            score.value += 100;
            // 正确地将CANNON.Vec3转换为THREE.Vector3
            const scorePosition = new THREE.Vector3(
              enemy.body.position.x,
              enemy.body.position.y,
              enemy.body.position.z
            );
            showScoreAnimation(scorePosition, 100);
            continue;
        }

        // AI Logic
        const enemyPos = enemy.body.position;
        const playerPos = tankBody.position;
        const distanceToPlayer = enemyPos.distanceTo(playerPos);
        const directionToPlayer = new CANNON.Vec3();
        playerPos.vsub(enemyPos, directionToPlayer);
        directionToPlayer.normalize();

        const targetAngle = Math.atan2(directionToPlayer.x, directionToPlayer.z);
        enemy.body.quaternion.setFromEuler(0, targetAngle, 0); // Directly rotate physics body

        // Movement & Avoidance
        let moveDirection = directionToPlayer.clone();
        let shouldMove = false;
        if (distanceToPlayer < 5) { // Too close, back away
             moveDirection.scale(-1, moveDirection);
             shouldMove = true;
        } else if (distanceToPlayer < 25 && distanceToPlayer > 6) { // Move towards if in range
            shouldMove = true;
        }
        
        if (shouldMove) {
            // Simple Obstacle Avoidance
            let avoidance = new CANNON.Vec3(0,0,0);
            for (const obs of obstacles) {
                 const distToObs = enemyPos.distanceTo(obs.body.position);
                 if (distToObs < 5) {
                      const avoidDir = new CANNON.Vec3();
                      enemyPos.vsub(obs.body.position, avoidDir);
                      avoidDir.normalize();
                      avoidDir.scale((5 - distToObs) * 0.5, avoidDir); 
                      avoidance.vadd(avoidDir, avoidance);
                 }
            }
            if(avoidance.lengthSquared() > 0) {
                 avoidance.normalize();
                 moveDirection.vadd(avoidance.scale(0.5, avoidance), moveDirection);
                 moveDirection.normalize();
            }
            
            const moveSpeed = 2;
            enemy.body.velocity.x = moveDirection.x * moveSpeed;
            enemy.body.velocity.z = moveDirection.z * moveSpeed;
        } else {
            enemy.body.velocity.x = 0; // Stop if not moving
            enemy.body.velocity.z = 0;
        }
        
        // Shooting
        if (distanceToPlayer < 20 && distanceToPlayer > 5) {
            enemy.lastShootTime -= deltaTime;
            if (enemy.lastShootTime <= 0) {
                fireEnemyBullet(enemy);
                enemy.lastShootTime = 2 + Math.random() * 2;
            }
        }

        // Sync visual representation for Instanced Mesh
        if ((enemy.mesh as any).isInstancedMesh && enemyInstancedMesh) {
             try {
                 const matrix = new THREE.Matrix4();
                 // 正确地将CANNON.Vec3和CANNON.Quaternion转换为THREE类型
                 const position = new THREE.Vector3(
                     enemy.body.position.x,
                     enemy.body.position.y,
                     enemy.body.position.z
                 );
                 const quaternion = new THREE.Quaternion(
                     enemy.body.quaternion.x,
                     enemy.body.quaternion.y,
                     enemy.body.quaternion.z,
                     enemy.body.quaternion.w
                 );
                 matrix.compose(
                     position, 
                     quaternion, 
                     new THREE.Vector3(1,1,1) // Assuming uniform scale
                 );
                  const instanceId = (enemy.mesh as any).instanceId;
                  if (instanceId >= 0 && instanceId < enemyInstancedMesh.count) {
                       enemyInstancedMesh.setMatrixAt(instanceId, matrix);
                       instanceMatrixNeedsUpdate = true;
                  } else {
                      console.warn(`Invalid instanceId ${instanceId} for enemy`);
                  }
             } catch (error) { console.error("Error updating instance matrix:", error); }
        } else if (enemy.mesh instanceof THREE.Object3D) { // Sync non-instanced mesh
            enemy.mesh.position.set(
                enemy.body.position.x,
                enemy.body.position.y,
                enemy.body.position.z
            );
            enemy.mesh.quaternion.set(
                enemy.body.quaternion.x,
                enemy.body.quaternion.y,
                enemy.body.quaternion.z,
                enemy.body.quaternion.w
            );
        }
    }

    if (enemyInstancedMesh && instanceMatrixNeedsUpdate) {
        enemyInstancedMesh.instanceMatrix.needsUpdate = true;
    }
 };

const fireEnemyBullet = (enemy: EnemyData) => { 
    if (!tankBody || !enemy.body) return;

    const rayStart = enemy.body.position.clone();
    rayStart.y += 0.5;
    const rayEnd = tankBody.position.clone();
    rayEnd.y += 0.5;

    const rayDirection = new CANNON.Vec3();
    rayEnd.vsub(rayStart, rayDirection);
    const rayLength = rayDirection.length();
    rayDirection.normalize();
    
    let blocked = false;
    for (const obs of obstacles) {
        if (!obs.body) continue;
        const enemyToObs = new CANNON.Vec3();
        obs.body.position.vsub(rayStart, enemyToObs);
        const proj = enemyToObs.dot(rayDirection);
        if (proj > 0.1 && proj < rayLength) {
            const distSq = enemyToObs.lengthSquared() - proj * proj;
            const obsShape = obs.body.shapes[0];
            let obsRadiusSq = 2 * 2; // Default approx
             if (obsShape instanceof CANNON.Box) {
                  obsRadiusSq = obsShape.halfExtents.lengthSquared();
             } else if (obsShape instanceof CANNON.Cylinder) {
                 // Use radiusTop/radiusBottom and height for approximation
                 const r = Math.max(obsShape.radiusTop, obsShape.radiusBottom);
                 const h = obsShape.height;
                 obsRadiusSq = r * r + (h/2)*(h/2); // Approx bounding sphere radius squared
             } else if (obsShape instanceof CANNON.Sphere) {
                  obsRadiusSq = obsShape.radius * obsShape.radius;
             }
            if (distSq < obsRadiusSq) {
                blocked = true;
                break;
            }
        }
    }

    if (blocked) return;

    const muzzleOffsetLocal = new CANNON.Vec3(0, 0.5, 1.5);
    const bulletPositionCannon = new CANNON.Vec3();
    enemy.body.position.vadd(
        enemy.body.quaternion.vmult(muzzleOffsetLocal, new CANNON.Vec3()),
        bulletPositionCannon
    );
    
    // 正确地将CANNON.Vec3转换为THREE.Vector3
    const bulletPosition = new THREE.Vector3(
        bulletPositionCannon.x,
        bulletPositionCannon.y,
        bulletPositionCannon.z
    );
    
    // 正确地将CANNON.Vec3转换为THREE.Vector3
    const bulletDirection = new THREE.Vector3(
        rayDirection.x,
        rayDirection.y, 
        rayDirection.z
    );

    const bullet = new Bullet(scene, world, bulletPosition, bulletDirection);
    enemyBullets.push(bullet);
    createMuzzleFlash(bulletPosition, bulletDirection);
};

// --- Bullet Update --- 
const updateBullets = (deltaTime: number) => {
    // Update player bullets
    for (let i = bullets.length - 1; i >= 0; i--) {
        const bullet = bullets[i];
        bullet.update(deltaTime);

        if (!bullet.isActive) {
            bullet.destroy(scene, world);
            bullets.splice(i, 1);
            continue;
        }
        
        // Collision checks should ideally use physics events
        // Simple distance checks as fallback:
        let hit = false;
        for (const obs of obstacles) {
            if (!obs.body) continue;
            if (bullet.body && bullet.body.position.distanceTo(obs.body.position) < 2) {
                 // 正确地将CANNON.Vec3转换为THREE.Vector3
                 const hitPosition = new THREE.Vector3(
                     bullet.body.position.x,
                     bullet.body.position.y,
                     bullet.body.position.z
                 );
                 createHitEffect(hitPosition);
                 bullet.destroy(scene, world);
                 bullets.splice(i, 1);
                 hit = true; break;
            }
        }
        if(hit) continue;

        for (let j = enemies.length - 1; j >= 0; j--) {
             const enemy = enemies[j];
             if(enemy.health <= 0 || !enemy.body) continue;
             if (bullet.body && bullet.body.position.distanceTo(enemy.body.position) < 2) { 
                 enemy.health -= 50;
                 // 正确地将CANNON.Vec3转换为THREE.Vector3
                 const hitPosition = new THREE.Vector3(
                     enemy.body.position.x,
                     enemy.body.position.y,
                     enemy.body.position.z
                 );
                 showScoreAnimation(hitPosition, 50);
                 createHitEffect(hitPosition);
                 bullet.destroy(scene, world);
                 bullets.splice(i, 1);
                 hit = true; break;
             }
        }
         if(hit) continue;
    }
    
    // Update enemy bullets
     for (let i = enemyBullets.length - 1; i >= 0; i--) {
        const bullet = enemyBullets[i];
        bullet.update(deltaTime);

        if (!bullet.isActive) {
            bullet.destroy(scene, world);
            enemyBullets.splice(i, 1);
            continue;
        }
        
        let hit = false;
        for (const obs of obstacles) {
             if (!obs.body) continue;
             if (bullet.body && bullet.body.position.distanceTo(obs.body.position) < 2) {
                 // 正确地将CANNON.Vec3转换为THREE.Vector3
                 const hitPosition = new THREE.Vector3(
                     bullet.body.position.x,
                     bullet.body.position.y, 
                     bullet.body.position.z
                 );
                 createHitEffect(hitPosition);
                 bullet.destroy(scene, world);
                 enemyBullets.splice(i, 1);
                 hit = true; break;
             }
        }
        if(hit) continue;

        if (tankBody && bullet.body && bullet.body.position.distanceTo(tankBody.position) < 2) {
             damagePlayer(10);
             // 正确地将CANNON.Vec3转换为THREE.Vector3
             const hitPosition = new THREE.Vector3(
                 tankBody.position.x,
                 tankBody.position.y,
                 tankBody.position.z
             );
             createHitEffect(hitPosition);
             bullet.destroy(scene, world);
             enemyBullets.splice(i, 1);
             hit = true; 
        }
         if(hit) continue;
    }
};

// --- Collision Handling --- (Simplified - recommend physics events)
const checkCollisions = () => {
  if (tankBody) {
      for (let i = enemies.length - 1; i >= 0; i--) {
          const enemy = enemies[i];
          if (enemy.health <=0 || !enemy.body) continue;
          const distance = tankBody.position.distanceTo(enemy.body.position);
          if (distance < 3) { 
              damagePlayer(0.1); 
          }
      }
  }
};

// --- Player Damage ---
const damagePlayer = (amount: number) => {
  if (gameOver.value) return;
  health.value -= amount;
  playShakeEffect();
  if (health.value <= 0) {
    health.value = 0;
    endGame();
  }
};

// --- Effects --- 
const playShakeEffect = () => { sceneContainer.value?.classList.add('shake'); setTimeout(() => sceneContainer.value?.classList.remove('shake'), 500); };
const createMuzzleFlash = (position: THREE.Vector3, direction: THREE.Vector3) => { 
    const flash = new THREE.PointLight(0xff6600, 5, 3);
    flash.position.copy(position).add(direction.clone().multiplyScalar(0.5));
    scene.add(flash);

    const flashGeometry = new THREE.SphereGeometry(0.3, 8, 8);
    const flashMaterial = new THREE.MeshBasicMaterial({ color: 0xff9900, transparent: true, opacity: 0.8 });
    const flashMesh = new THREE.Mesh(flashGeometry, flashMaterial);
    flashMesh.position.copy(flash.position);
    scene.add(flashMesh);

    setTimeout(() => {
        if(scene.children.includes(flash)) scene.remove(flash);
        if(scene.children.includes(flashMesh)) scene.remove(flashMesh);
        flashGeometry.dispose();
        flashMaterial.dispose();
    }, 80); 
};
const createExplosion = (position: THREE.Vector3) => { 
    playSound(explosionSound);
    playShakeEffect();
    const explosionLight = new THREE.PointLight(0xff5500, 8, 10);
    explosionLight.position.copy(position);
    scene.add(explosionLight);

    const particleCount = 30;
    const particles = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const velocities: {x:number, y:number, z:number}[] = []; // Correctly type velocities

    for (let i = 0; i < particleCount; i++) {
        positions[i * 3] = position.x;
        positions[i * 3 + 1] = position.y;
        positions[i * 3 + 2] = position.z;
        colors[i * 3] = 1; colors[i * 3 + 1] = Math.random() * 0.7; colors[i * 3 + 2] = 0;
        velocities.push({ 
            x: (Math.random() - 0.5) * 0.2, 
            y: Math.random() * 0.2 + 0.05, 
            z: (Math.random() - 0.5) * 0.2 
        });
    }
    particles.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particles.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const particleMaterial = new THREE.PointsMaterial({ size: 0.5, vertexColors: true, transparent: true, opacity: 1.0, blending: THREE.AdditiveBlending, sizeAttenuation: true });
    const particleSystem = new THREE.Points(particles, particleMaterial);
    scene.add(particleSystem);

    let time = 0;
    const animateExplosion = () => {
        if (time > 1.2) {
            if(scene.children.includes(particleSystem)) scene.remove(particleSystem);
            if(scene.children.includes(explosionLight)) scene.remove(explosionLight);
            particles.dispose();
            particleMaterial.dispose();
            return;
        }
        time += 0.016;
        explosionLight.intensity = Math.max(0, 8 - time * 10);
        const posArray = particles.attributes.position.array as Float32Array;
        for (let i = 0; i < particleCount; i++) {
            posArray[i * 3] += velocities[i].x;
            posArray[i * 3 + 1] += velocities[i].y;
            posArray[i * 3 + 2] += velocities[i].z;
            velocities[i].y -= 0.005; // Gravity
        }
        particles.attributes.position.needsUpdate = true;
        particleMaterial.opacity = Math.max(0, 1 - time / 1.0);
        requestAnimationFrame(animateExplosion);
    };
    animateExplosion();
 };
const createHitEffect = (position: THREE.Vector3) => { 
    playSound(hitSound);
    const hitGeometry = new THREE.SphereGeometry(0.4, 8, 8);
    const hitMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00, transparent: true, opacity: 1.0 });
    const hitMesh = new THREE.Mesh(hitGeometry, hitMaterial);
    hitMesh.position.copy(position);
    scene.add(hitMesh);

    let scale = 1.0;
    const animateHit = () => {
        if (!scene.children.includes(hitMesh)) return;
        scale += 0.15;
        hitMesh.scale.set(scale, scale, scale);
        hitMaterial.opacity -= 0.08;
        if (hitMaterial.opacity <= 0) {
            scene.remove(hitMesh);
            hitGeometry.dispose();
            hitMaterial.dispose();
        } else {
            requestAnimationFrame(animateHit);
        }
    };
    animateHit();
};
const showScoreAnimation = (position: THREE.Vector3, points: number) => { 
    const scoreElem = document.createElement('div');
    scoreElem.className = 'score-popup';
    scoreElem.textContent = `+${points}`;
    const screenPosition = worldToScreen(position);
    scoreElem.style.left = `${screenPosition.x}px`;
    scoreElem.style.top = `${screenPosition.y}px`;
    document.body.appendChild(scoreElem);
    setTimeout(() => {
        // Check parentNode before removing
        if (scoreElem.parentNode === document.body) {
            document.body.removeChild(scoreElem);
        }
    }, 1000);
 };
const worldToScreen = (position: THREE.Vector3): { x: number, y: number } => { 
    const vector = position.clone(); // Use clone directly
    if (!camera.value) return { x:0, y:0 };
    vector.project(camera.value); 
    const x = (vector.x * 0.5 + 0.5) * window.innerWidth;
    const y = (-vector.y * 0.5 + 0.5) * window.innerHeight;
    return { x, y };
};

// --- Obstacle Creation --- 
const createObstacles = (count: number) => { 
    console.log(`创建${count}个掩体...`);
    
    const geometries = [
        new THREE.BoxGeometry(3, 2, 3),
        new THREE.ConeGeometry(1.5, 3, 8),
        new THREE.CylinderGeometry(1.5, 1.5, 3, 8)
    ];
    const materials = [
        new THREE.MeshStandardMaterial({ color: 0x8B4513, roughness: 0.7 }),
        new THREE.MeshStandardMaterial({ color: 0x4B6F44, roughness: 0.7 }),
        new THREE.MeshStandardMaterial({ color: 0x607D8B, roughness: 0.6 })
    ];

    for (let i = 0; i < count; i++) {
        let x, z, distanceFromPlayer;
        do { 
             x = (Math.random() - 0.5) * 80;
             z = (Math.random() - 0.5) * 80;
             distanceFromPlayer = Math.sqrt(x*x + z*z);
        } while (distanceFromPlayer < 10);

        const geomIndex = Math.floor(Math.random() * geometries.length);
        const matIndex = Math.floor(Math.random() * materials.length);
        const obstacleMesh = new THREE.Mesh(geometries[geomIndex], materials[matIndex]);
        obstacleMesh.castShadow = true;
        obstacleMesh.receiveShadow = true;

        let yPos = 1; let yBodyPos = 1;
        let obstacleShape: CANNON.Shape;
        if (geomIndex === 0) { // Box
            yPos = 1; yBodyPos = 1;
            obstacleShape = new CANNON.Box(new CANNON.Vec3(1.5, 1, 1.5));
        } else if (geomIndex === 1) { // Cone
            yPos = 1.5; yBodyPos = 1.5;
            obstacleShape = new CANNON.Cylinder(0.2, 1.5, 3, 8);
        } else { // Cylinder
            yPos = 1.5; yBodyPos = 1.5;
            obstacleShape = new CANNON.Cylinder(1.5, 1.5, 3, 8);
        }
        obstacleMesh.position.set(x, yPos, z);
        obstacleMesh.rotation.y = Math.random() * Math.PI * 2;
        scene.add(obstacleMesh);
        
        const obstacleBody = new CANNON.Body({ mass: 0, position: new CANNON.Vec3(x, yBodyPos, z), shape: obstacleShape });
        obstacleBody.quaternion.setFromEuler(0, obstacleMesh.rotation.y, 0);
        world.addBody(obstacleBody);
        obstacles.push({ mesh: obstacleMesh, body: obstacleBody });
    }
    console.log(`成功创建${obstacles.length}个障碍物`);
};

// --- Camera Update ---
const updateCamera = () => {
  if (!tankBody || !camera.value) return;

  const lookAtOffset = new THREE.Vector3(0, 1, 0);
  // 正确地将CANNON.Vec3转换为THREE.Vector3
  const lookAtPosition = new THREE.Vector3(
    tankBody.position.x,
    tankBody.position.y,
    tankBody.position.z
  ).add(lookAtOffset);

  // Update angle based on mouse movement (from InputManager)
  cameraAngleH.value -= mouseMovementX.value * mouseSensitivity;
  // Reset mouseMovementX in InputManager or after use here? 
  // Let's reset it after use for now. InputManager could be improved later.
  if (inputManager.mouseMovementX.value !== 0) {
       inputManager.mouseMovementX.value = 0;
  }

  // Calculate desired camera position based on angle and distance
  const offsetX = followDistance * Math.sin(cameraAngleH.value) * Math.cos(cameraAngleV.value);
  const offsetY = followDistance * Math.sin(cameraAngleV.value);
  const offsetZ = followDistance * Math.cos(cameraAngleH.value) * Math.cos(cameraAngleV.value);
  const cameraOffset = new THREE.Vector3(offsetX, offsetY, offsetZ);
  // 正确地将CANNON.Vec3转换为THREE.Vector3
  const idealPosition = new THREE.Vector3(
    tankBody.position.x,
    tankBody.position.y,
    tankBody.position.z
  ).add(cameraOffset);

  // Simple line-of-sight check (Raycasting)
  const raycaster = new THREE.Raycaster();
  const direction = idealPosition.clone().sub(lookAtPosition).normalize();
  // Start ray slightly away from the lookAt point to avoid self-intersection
  raycaster.set(lookAtPosition.clone().add(direction.clone().multiplyScalar(0.1)), direction);
  raycaster.far = followDistance;
  const intersects = raycaster.intersectObjects(obstacles.map(o => o.mesh), true); // Check recursively

  let finalCameraPosition = idealPosition;
  if (intersects.length > 0) {
      // Find the closest intersection point that isn't behind the ideal position
      let closestDistance = followDistance;
      for(const intersect of intersects) {
          if (intersect.distance < closestDistance && intersect.distance > 0.1) { // Ensure it's in front
              closestDistance = intersect.distance;
              finalCameraPosition = intersect.point.clone().add(direction.multiplyScalar(-0.5)); // Pull back slightly
          }
      }
  }

  camera.value.position.lerp(finalCameraPosition, cameraLerpFactor);
  camera.value.lookAt(lookAtPosition);
};

// --- Start Game ---
const startGame = () => {
  gameStarted.value = true;
  showHelp.value = false;
  isPaused.value = false;
  lastTime = performance.now();
  engineSound?.play().catch(e => console.warn('引擎声音播放失败:', e));
  // Request pointer lock when starting the game
  requestPointerLock(); // Use the imported function
  animate();
};

// --- Component Lifecycle Hooks ---
onMounted(() => {
  console.log('组件挂载');
  if (!checkWebGLSupport()) {
    webGLSupported.value = false;
    return;
  }
  
  try {
      sceneManager.initSceneEssentials();
      physicsManager.initPhysics();
      // InputManager setup is handled internally via its onMounted
      
      createGroundAndGrid();
      createPlayerTank();
      
      // 直接创建障碍物，不等待模型加载
      createObstacles(20);
      enemyInstancedMesh = initializeEnemySystem(); 
      console.log('初始元素创建完成');
      
      // First render after setup
       if (renderer.value && camera.value) { // Check refs
            renderer.value.render(scene, camera.value);
            console.log("Initial render complete.");
       } else {
           console.warn("Renderer or camera not ready for initial render.");
       }
      
      initSounds();
      lastTime = performance.now(); // Set initial time

      // Initial render
      if (renderer.value && camera.value) { 
           renderer.value.render(scene, camera.value);
      }
      
  } catch (e) {
      console.error('初始化期间出错:', e);
      webGLSupported.value = false;
  }
});

onBeforeUnmount(() => {
  console.log('组件卸载');
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }
  
  // Stop sounds
  shootSound?.pause(); shootSound = null;
  explosionSound?.pause(); explosionSound = null;
  hitSound?.pause(); hitSound = null;
  engineSound?.pause(); engineSound = null;

  // Cleanup managers (remove event listeners, dispose renderer etc.)
  sceneManager.cleanup();
  physicsManager.cleanup();
  // InputManager cleanup is handled by its own onBeforeUnmount

  // Dispose Three.js resources managed by this component
  scene.traverse((object) => {
    if (object instanceof THREE.Mesh || object instanceof THREE.Points) { 
      object.geometry?.dispose();
      if (object.material) {
        if (Array.isArray(object.material)) {
          object.material.forEach(material => {
              // Check if material has a map property before disposing
              if ('map' in material && material.map instanceof THREE.Texture) {
                  material.map.dispose();
              }
              material.dispose();
          });
        } else {
           // Check if material has a map property before disposing
           const mat = object.material as THREE.Material & { map?: THREE.Texture };
           if (mat.map) {
               mat.map.dispose();
           }
           mat.dispose();
        }
      }
    } 
    // TODO: Add disposal for other potential resources like textures not attached to materials
  });
  
  // Clear arrays to help GC
  bullets = [];
  enemyBullets = [];
  enemies = [];
  obstacles = [];
  
  // Nullify refs
  enemyInstancedMesh = null; 
  tank = null;
  tankBody = null;

  // Remove dynamically created DOM elements (like score popups)
  document.querySelectorAll('.score-popup').forEach(el => el.remove());

  console.log('清理完成');
});

</script>

<style scoped>
@import '../assets/styles/tankGame.css';
</style> 