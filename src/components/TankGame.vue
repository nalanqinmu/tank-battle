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
import { ref, onMounted, onBeforeUnmount } from 'vue';
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { Bullet } from './Bullet';
import { EnemyTank } from './EnemyTank';

// 游戏状态
const score = ref(0);
const health = ref(100);
const gameOver = ref(false);
const webGLSupported = ref(true);
const showGrid = ref(false); // 控制是否显示网格，默认不显示
const showHelp = ref(true); // 默认显示帮助面板
const gameStarted = ref(false); // 控制游戏是否开始
const mouseDown = ref(false); // 鼠标左键按下状态
const mousePosition = { x: 0, y: 0, lastX: 0, lastY: 0 }; // 鼠标位置
const pointerLocked = ref(false); // 指针锁定状态
const lastShootTime = ref(0); // 上次射击时间
const shootInterval = 0.3; // 射击间隔时间（秒）
const isPaused = ref(false); // 游戏暂停状态
const isMouseControlEnabled = ref(false); // 是否启用鼠标控制
const showScoreDelta = ref(false); // 显示分数增加动画
const scoreDelta = ref(0); // 分数增加值

// 摄像机控制参数
const cameraAngleH = ref(0); // 水平角度
const cameraAngleV = ref(Math.PI / 6); // 垂直角度 (初始向上倾斜)
const mouseSensitivity = 0.002; // 鼠标灵敏度
const followDistance = 10; // 相机跟随距离
const cameraLerpFactor = 0.1; // 相机移动平滑系数
// const minVerticalAngle = 0.1; // 移除 - 垂直角度不再由鼠标控制
// const maxVerticalAngle = Math.PI / 2 - 0.1; // 移除 - 垂直角度不再由鼠标控制

// 场景容器引用
const sceneContainer = ref<HTMLDivElement>();

// 三维场景相关变量
let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.WebGLRenderer;

// 物理世界
let world: CANNON.World;

// 游戏对象
let tank: THREE.Object3D | null = null;
let tankBody: CANNON.Body | null = null;
let bullets: Bullet[] = [];
let enemyBullets: Bullet[] = [];
let enemies: EnemyTank[] = [];
let obstacles: { mesh: THREE.Mesh, body: CANNON.Body }[] = []; // 掩体数组
let lastTime = 0;
let enemySpawnTimer = 0;
let animationFrameId: number | null = null;
let enemyInstancedMesh: THREE.InstancedMesh | null = null;

// 声音对象
let shootSound: any;
let explosionSound: any;
let hitSound: any;
let engineSound: any;

// 控制状态
const keys = {
  w: false,
  a: false,
  s: false,
  d: false,
  g: false,
  // space: false, // 移除 space 状态
  h: false, // 添加H键用于显示帮助面板
  p: false  // 添加P键用于暂停游戏
};

// 检查WebGL支持
const checkWebGLSupport = (): boolean => {
  try {
    const canvas = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && 
      (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
  } catch(e) {
    console.error('WebGL检测错误:', e);
    return false;
  }
};

// 创建简单场景，确保可见性
const createSimpleScene = () => {
  // 创建纹理加载器
  const textureLoader = new THREE.TextureLoader();
  
  // 尝试加载天空盒和地形纹理
  try {
    // 加载军事风格天空盒
    textureLoader.load('/textures/military_skybox.jpg', (texture) => {
      scene.background = texture;
    }, undefined, (err) => {
      console.warn('无法加载天空盒纹理，使用颜色作为替代:', err);
      scene.background = new THREE.Color(0x87CEEB);
    });
    
    // 加载沙漠地形纹理
    textureLoader.load('/textures/sand_dunes.jpg', (texture) => {
      texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(10, 10);
      
      // 创建地面
      const groundGeometry = new THREE.PlaneGeometry(100, 100, 1, 1);
      const groundMaterial = new THREE.MeshStandardMaterial({ 
        map: texture,
        side: THREE.DoubleSide
      });
      const ground = new THREE.Mesh(groundGeometry, groundMaterial);
      ground.rotation.x = -Math.PI / 2;
      ground.position.y = -0.01; // 略微下沉避免z-fighting
      scene.add(ground);
      
      // 创建网格作为辅助
      const gridHelper = new THREE.GridHelper(100, 100, 0x666666, 0xAAAAAA);
      gridHelper.position.y = 0.01;
      gridHelper.material.opacity = 0.25;
      gridHelper.material.transparent = true;
      gridHelper.visible = showGrid.value; // 根据变量控制是否显示
      scene.add(gridHelper);
    }, undefined, (err) => {
      console.warn('无法加载地形纹理，使用基本平面:', err);
      // 地面 - 使用平面和网格辅助一起增强立体感
      const groundGeometry = new THREE.PlaneGeometry(100, 100, 1, 1);
      const groundMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x1a5c1a,
        transparent: true,
        opacity: 0.7,
        side: THREE.DoubleSide
      });
      const ground = new THREE.Mesh(groundGeometry, groundMaterial);
      ground.rotation.x = -Math.PI / 2;
      ground.position.y = -0.01; // 略微下沉避免z-fighting
      scene.add(ground);
      
      // 增强的网格辅助
      const gridHelper = new THREE.GridHelper(100, 100, 0x666666, 0xAAAAAA);
      gridHelper.visible = showGrid.value; // 根据变量控制是否显示
      scene.add(gridHelper);
    });
  } catch (e) {
    console.error('加载纹理错误:', e);
    scene.background = new THREE.Color(0x87CEEB);
    
    // 回退到基本地面
    const groundGeometry = new THREE.PlaneGeometry(100, 100, 1, 1);
    const groundMaterial = new THREE.MeshBasicMaterial({ 
      color: 0x1a5c1a,
      transparent: true,
      opacity: 0.7,
      side: THREE.DoubleSide
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.01;
    scene.add(ground);
    
    const gridHelper = new THREE.GridHelper(100, 100, 0x666666, 0xAAAAAA);
    scene.add(gridHelper);
  }
  
  // 添加立方体表示坦克 - 尝试使用基本纹理
  try {
    textureLoader.load('/textures/tank_texture.png', (texture) => {
      console.log('玩家坦克纹理加载成功:', texture.uuid);
      texture.anisotropy = renderer.capabilities.getMaxAnisotropy(); // 高质量纹理
      
      const tankGeometry = new THREE.BoxGeometry(1.5, 0.8, 2.5);
      const tankMaterial = new THREE.MeshStandardMaterial({
        map: texture,
        metalness: 0.7,
        roughness: 0.3
      });
      tank = new THREE.Mesh(tankGeometry, tankMaterial);
      tank.position.set(0, 0.8, 0);
      scene.add(tank);
    }, undefined, (err) => {
      console.warn('无法加载玩家坦克纹理，使用基本模型:', err);
      const tankGeometry = new THREE.BoxGeometry(1.5, 0.8, 2.5);
      const tankMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x44ff44,
        wireframe: false // 使用实体显示
      });
      tank = new THREE.Mesh(tankGeometry, tankMaterial);
      tank.position.set(0, 0.8, 0);
      scene.add(tank);
    });
  } catch (e) {
    console.error('坦克模型创建错误:', e);
    const tankGeometry = new THREE.BoxGeometry(1.5, 0.8, 2.5);
    const tankMaterial = new THREE.MeshBasicMaterial({ 
      color: 0x44ff44,
      wireframe: false // 使用实体显示
    });
    tank = new THREE.Mesh(tankGeometry, tankMaterial);
    tank.position.set(0, 0.8, 0);
    scene.add(tank);
  }
  
  // 物理世界简化
  world = new CANNON.World({ gravity: new CANNON.Vec3(0, -10, 0) });
  
  // 坦克物理体 - 简化版本
  tankBody = new CANNON.Body({
    mass: 5,
    position: new CANNON.Vec3(0, 0.8, 0),
    shape: new CANNON.Box(new CANNON.Vec3(0.75, 0.4, 1.25))
  });
  world.addBody(tankBody);
  
  // 地面物理体
  const groundBody = new CANNON.Body({
    mass: 0,
    shape: new CANNON.Plane()
  });
  groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
  world.addBody(groundBody);
  
  // 添加环境雾效提升深度感
  scene.fog = new THREE.FogExp2(0x87CEEB, 0.01);
  
  // 确保所有网格助手的可见性设置正确
  updateGridHelperVisibility();
  
  // 创建掩体
  createObstacles(20); // 创建20个掩体
  
  console.log('简单场景创建完成，对象数量:', scene.children.length);
};

// 初始化声音系统
const initSounds = () => {
  // 使用Audio API实现简单声音
  try {
    // 射击声音
    shootSound = new Audio('/sounds/shoot.mp3');
    shootSound.volume = 0.4;
    
    // 爆炸声音
    explosionSound = new Audio('/sounds/explosion.mp3');
    explosionSound.volume = 0.6;
    
    // 命中声音
    hitSound = new Audio('/sounds/hit.mp3');
    hitSound.volume = 0.3;
    
    // 引擎声音 - 循环播放
    engineSound = new Audio('/sounds/engine.mp3');
    engineSound.volume = 0.2;
    engineSound.loop = true;
    
    console.log('声音系统初始化成功');
  } catch (e) {
    console.warn('声音系统初始化失败:', e);
  }
};

// 播放声音的通用函数
const playSound = (sound) => {
  if (!sound) return;
  
  try {
    // 克隆声音对象，允许重叠播放
    const soundClone = sound.cloneNode();
    soundClone.play().catch(e => {
      console.warn('播放声音失败:', e);
    });
  } catch (e) {
    console.warn('播放声音出错:', e);
  }
};

// 初始化Three.js场景
const initScene = () => {
  if (!sceneContainer.value) return;
  
  console.log('初始化场景');
  
  // 检查WebGL支持
  if (!checkWebGLSupport()) {
    console.error('WebGL不受支持');
    webGLSupported.value = false;
    return;
  }
  
  // 创建场景
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87CEEB);
  
  try {
    // 创建相机
    const aspect = window.innerWidth / window.innerHeight;
    camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 1000); 
    // 初始位置和朝向将在 updateCamera 中设置
    // camera.lookAt(0, 0, 0);
    
    // 创建渲染器
    renderer = new THREE.WebGLRenderer({ 
      antialias: true,
      canvas: document.createElement('canvas')
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x87CEEB, 1);
    
    // 添加到DOM
    sceneContainer.value.innerHTML = '';
    sceneContainer.value.appendChild(renderer.domElement);
    
    // 添加鼠标事件监听 - click 触发 PointerLock, mousemove 由 document 监听
    renderer.domElement.addEventListener('click', handleCanvasClick);
    document.addEventListener('mousemove', handleMouseMove); // 监听 document
    document.addEventListener('mousedown', handleMouseDown); // 在 document 上添加监听器
    document.addEventListener('mouseup', handleMouseUp); // 监听 document
    
    // 添加窗口大小调整
    window.addEventListener('resize', onWindowResize);
    
    // 添加灯光
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.0);
    scene.add(ambientLight);
    
    // 添加方向光模拟阳光
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(50, 100, 50);
    directionalLight.castShadow = true;
    scene.add(directionalLight);
    
    // 创建简单场景
    createSimpleScene();
    
    // 初始化敌人渲染系统
    console.log('初始化敌人渲染系统...');
    enemyInstancedMesh = initializeEnemySystem();
    console.log('敌人实例化网格初始化完成:', enemyInstancedMesh);
    
    // 初始化声音系统
    initSounds();
    
    // 立即渲染一次确认场景可见
    renderer.render(scene, camera);
    console.log('初次渲染完成');
    
  } catch (e) {
    console.error('初始化错误:', e);
    webGLSupported.value = false;
  }
};

// 处理键盘按下事件
const handleKeyDown = (event: KeyboardEvent) => {
  event.preventDefault(); // 防止页面滚动
  
  // 如果帮助面板打开，按任意键关闭它
  if (showHelp.value) {
    showHelp.value = false;
    return;
  }
  
  // 获取键值
  const key = event.key.toLowerCase();
  
  // 处理P键暂停，无论游戏状态如何都允许
  if (key === 'p' && !keys.p && gameStarted.value && !gameOver.value) {
    keys.p = true;
    togglePause();
    return;
  }
  
  // 如果游戏暂停中，不处理其他键盘输入
  if (isPaused.value) {
    return;
  }
  
  // 如果是G键而且之前未按下，则切换网格显示
  if (key === 'g' && !keys.g) {
    keys.g = true;
    showGrid.value = !showGrid.value;
    updateGridHelperVisibility();
    return;
  }
  
  // 如果是H键而且之前未按下，显示帮助面板
  if (key === 'h' && !keys.h) {
    keys.h = true;
    showHelp.value = true;
    return;
  }
  
  switch (key) {
    case 'w': keys.w = true; break;
    case 'a': keys.a = true; break;
    case 's': keys.s = true; break;
    case 'd': keys.d = true; break;
    // case ' ': 
    //   keys.space = true; 
    //   fireSimpleBullet(); 
    //   break; // 移除空格键开火逻辑
  }
};

// 处理键盘松开事件
const handleKeyUp = (event: KeyboardEvent) => {
  switch (event.key.toLowerCase()) {
    case 'w': keys.w = false; break;
    case 'a': keys.a = false; break;
    case 's': keys.s = false; break;
    case 'd': keys.d = false; break;
    case 'g': keys.g = false; break;
    case 'h': keys.h = false; break;
    case 'p': keys.p = false; break;
    // case ' ': keys.space = false; break; // 移除空格键状态更新
  }
};

// 切换游戏暂停状态
const togglePause = () => {
  isPaused.value = !isPaused.value;
  console.log('游戏暂停状态:', isPaused.value);
  
  if (isPaused.value) {
    // 游戏暂停，释放指针锁定
    if (pointerLocked.value) {
      document.exitPointerLock(); // 退出锁定
    }
  } else {
    // 游戏继续，恢复动画循环
    if (animationFrameId === null) {
      lastTime = performance.now();
      animationFrameId = requestAnimationFrame(animate);
    }
    // (可选) 可以在此处重新请求指针锁定，如果需要的话
    // else if (sceneContainer.value && !pointerLocked.value) {
    //   sceneContainer.value.requestPointerLock();
    // }
  }
};

// 简化版发射子弹
const fireSimpleBullet = () => {
  // console.log('fireSimpleBullet() called. Tank/Body exists?', !!tank, !!tankBody); // 移除日志
  if (!tank || !tankBody) {
    // console.log('fireSimpleBullet blocked: Tank or Body missing.'); // 移除日志
    return;
  }
  
  // 创建一个简单的球体表示子弹
  const bulletGeometry = new THREE.SphereGeometry(0.2, 8, 8);
  const bulletMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
  const bulletMesh = new THREE.Mesh(bulletGeometry, bulletMaterial);
  
  // TPS 模式: 子弹方向基于坦克自身朝向
  const bulletDirection = new THREE.Vector3(0, 0, 1); // 坦克局部坐标系Z轴正方向
  bulletDirection.applyQuaternion(tank.quaternion); // 转换到世界坐标系
  bulletDirection.normalize();

  // TPS 模式: 子弹位置从坦克前方模拟炮管位置发射
  const muzzleOffset = new THREE.Vector3(0, 0.5, 1.5); // x=0, y=0.5(中心偏上), z=1.5(炮管长度)
  const bulletPosition = tank.localToWorld(muzzleOffset.clone());
  
  // 创建Bullet实例
  const bullet = new Bullet(scene, world, bulletPosition, bulletDirection);
  bullets.push(bullet);
  
  // 创建射击特效
  createMuzzleFlash(bulletPosition.clone(), bulletDirection);
  
  // 播放射击声音
  playSound(shootSound);
};

// 简化版坦克移动，恢复为 A/D 转弯, W/S 前后
const updateSimpleTankMovement = () => {
  if (!tank || !tankBody) return;

  const moveSpeed = 0.15; // 移动速度
  const rotateSpeed = 0.03; // 旋转速度

  // 获取坦克的前方向 (基于坦克自身旋转)
  const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(tank.quaternion);
  
  // 计算当前帧的移动向量
  const moveVector = new THREE.Vector3(0, 0, 0);
  if (keys.w) {
    moveVector.add(forward.clone().multiplyScalar(moveSpeed));
  }
  if (keys.s) {
    moveVector.sub(forward.clone().multiplyScalar(moveSpeed));
  }

  // 应用旋转
  if (keys.a) { 
    tank.rotateY(rotateSpeed);
  }
  if (keys.d) { 
    tank.rotateY(-rotateSpeed);
  }
  
  // 计算新的潜在位置
  const currentPosition = tank.position.clone();
  const newPosition = currentPosition.clone().add(moveVector);

  // --- 简单的碰撞检测 (保持不变) ---
  let collisionDetected = false;
  for (const obstacle of obstacles) {
    const distance = newPosition.distanceTo(obstacle.mesh.position);
    // 坦克尺寸约1.5x2.5，障碍物尺寸3x3，使用简化的碰撞半径
    const collisionRadius = 1.5 + 1.5; // 坦克半径 + 障碍物半径 (近似)
    if (distance < collisionRadius) {
      collisionDetected = true;
      break;
    }
  }

  // 只有在没有碰撞的情况下才更新位置
  if (!collisionDetected) {
    tank.position.copy(newPosition);
  } else {
    // 如果发生碰撞，可以尝试只应用未碰撞方向的移动分量（更复杂的处理）
    // 简单的处理：不动
    console.log("坦克与障碍物碰撞");
  }

  // --- 更新坦克朝向 ---
  // 在TPS模式下，坦克朝向由 A/D 键控制，不需要根据相机方向设置
  // tank.rotation.y = Math.atan2(cameraDirection.x, cameraDirection.z); 

  // 同步物理体位置和旋转
  if (tankBody) {
    (tankBody.position as any).copy(tank.position);
    (tankBody.quaternion as any).copy(tank.quaternion); // 使用坦克的旋转
  }
};

// 窗口大小变化处理
const onWindowResize = () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.render(scene, camera);
};

// 简化版动画循环
const animate = () => {
  if (gameOver.value || !gameStarted.value) return;
  
  // 如果游戏暂停，不继续渲染
  if (isPaused.value) {
    // 需要继续请求下一帧，否则无法在暂停后恢复
    animationFrameId = requestAnimationFrame(animate); 
    return;
  }
  
  const currentTime = performance.now();
  const deltaTime = (currentTime - lastTime) / 1000;
  lastTime = currentTime;
  
  animationFrameId = requestAnimationFrame(animate);
  
  try {
    // 更新物理世界
    world.step(1/60);
    
    // 更新坦克移动
    updateSimpleTankMovement();
    
    // 更新相机跟随坦克
    updateCamera();
    
    // 更新敌人AI
    updateEnemies(deltaTime);
    
    // 更新所有子弹
    updateBullets(deltaTime);
    
    // 检测碰撞
    checkCollisions();
    
    // 处理持续射击
    updateContinuousShooting(deltaTime);
    
    // 渲染场景
    renderer.render(scene, camera);
  } catch (e) {
    console.error('渲染错误:', e);
  }
};

// 处理持续射击
const updateContinuousShooting = (deltaTime) => {
  // 如果未开始游戏或游戏结束，不处理射击
  if (!gameStarted.value || gameOver.value) return;
  
  // console.log('Checking continuous shooting. mouseDown:', mouseDown.value); // 添加日志
  // 检查是否持续按下鼠标左键
  if (mouseDown.value) {
    // 更新上次射击时间
    lastShootTime.value -= deltaTime;
    
    // 如果达到射击间隔，允许再次射击
    if (lastShootTime.value <= 0) {
      console.log('Firing from updateContinuousShooting. mouseDown:', mouseDown.value); // 添加日志
      fireSimpleBullet();
      lastShootTime.value = shootInterval; // 重置射击计时器
      
      // 记录射击事件
      // console.log('射击', new Date().toISOString()); // 暂时注释掉，避免过多日志
    }
  }
};

// 游戏结束
const endGame = () => {
  gameOver.value = true;
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId);
  }
};

// 重新开始游戏
const restartGame = () => {
  // 重置游戏状态
  score.value = 0;
  health.value = 100;
  gameOver.value = false;
  gameStarted.value = true; // 确保游戏状态为已开始
  
  // 清理所有子弹
  bullets.forEach(bullet => {
    scene.remove(bullet.mesh);
  });
  bullets = [];
  
  enemyBullets.forEach(bullet => {
    scene.remove(bullet.mesh);
  });
  enemyBullets = [];
  
  // 清理所有敌人
  enemies.forEach(enemy => {
    scene.remove(enemy.mesh);
    world.removeBody(enemy.body);
  });
  enemies = [];
  
  // 清理所有掩体
  obstacles.forEach(obstacle => {
    scene.remove(obstacle.mesh);
    world.removeBody(obstacle.body);
  });
  obstacles = [];
  
  // 重置坦克位置
  if (tank) {
    tank.position.set(0, 0.8, 0);
    tank.rotation.set(0, 0, 0);
  }
  
  if (tankBody) {
    tankBody.position.set(0, 0.8, 0);
    tankBody.quaternion.set(0, 0, 0, 1);
    tankBody.velocity.set(0, 0, 0);
    tankBody.angularVelocity.set(0, 0, 0);
  }
  
  // 重新创建掩体
  createObstacles(20);
  
  // 重置敌人生成计时器
  enemySpawnTimer = 3;
  
  // 重置时间
  lastTime = performance.now();
  
  // 重新开始动画循环
  animate();
};

// 使用InstancedMesh优化敌人渲染
const initializeEnemySystem = () => {
  // 创建敌人几何体
  const enemyGeometry = new THREE.BoxGeometry(1.5, 0.8, 2.5);

  // 先创建默认材质和实例化网格
  const defaultMaterial = new THREE.MeshBasicMaterial({
    color: 0xff4444, // 鲜明的红色
    wireframe: false // 实体显示
  });
  const instancedMesh = new THREE.InstancedMesh(enemyGeometry, defaultMaterial, 10); // 假设最多10个敌人
  instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); // 允许高效更新矩阵
  instancedMesh.count = 0; // 初始实例数量为0
  scene.add(instancedMesh); // 将实例化网格添加到场景

  // *** 添加此行以禁用视锥体剔除 ***
  instancedMesh.frustumCulled = false;
  // *********************************

  console.log('敌方坦克实例化网格已创建，并已禁用视锥体剔除');

  // 尝试加载敌人纹理并更新材质 (异步)
  const textureLoader = new THREE.TextureLoader();
  textureLoader.load('/textures/enemy_tank.png', (texture) => {
    console.log('敌方坦克纹理加载成功:', texture.uuid);
    texture.anisotropy = renderer.capabilities.getMaxAnisotropy();

    // 创建带有纹理的材质
    const texturedMaterial = new THREE.MeshStandardMaterial({
      map: texture,
      metalness: 0.7,
      roughness: 0.3
    });

    // 更新实例化网格的材质
    instancedMesh.material = texturedMaterial as unknown as THREE.MeshBasicMaterial;
    console.log('敌方坦克材质已更新为纹理材质');
  }, undefined, (err) => {
    console.warn('敌方坦克纹理加载失败，保持默认材质:', err);
  });

  // 返回创建的实例化网格引用
  return instancedMesh;
};

// 添加敌人生成函数 - 改进版本使用InstancedMesh
const spawnEnemy = () => {
  if (enemies.length >= 5) return; // 限制敌人数量
  
  // 随机位置（在玩家周围一定距离）
  const angle = Math.random() * Math.PI * 2;
  const distance = 20 + Math.random() * 15; // 20-35距离
  const x = Math.cos(angle) * distance;
  const z = Math.sin(angle) * distance;
  
  // 创建敌人坦克几何体 - 如果实例化渲染不可用，回退到单个网格
  let enemyMesh;
  
  if (enemyInstancedMesh && enemyInstancedMesh.count < 10) {
    console.log('使用实例化网格创建敌人:', enemyInstancedMesh.count);
    // 使用实例化渲染
    const instanceId = enemyInstancedMesh.count;
    
    // 创建矩阵
    const matrix = new THREE.Matrix4();
    matrix.makeTranslation(x, 0.8, z);
    
    // 随机旋转矩阵
    const rotationMatrix = new THREE.Matrix4();
    rotationMatrix.makeRotationY(Math.random() * Math.PI * 2);
    matrix.multiply(rotationMatrix);
    
    // 设置实例矩阵
    enemyInstancedMesh.setMatrixAt(instanceId, matrix);
    enemyInstancedMesh.count++;
    enemyInstancedMesh.instanceMatrix.needsUpdate = true;
    
    // 创建虚拟网格作为引用
    enemyMesh = {
      isInstancedMesh: true,
      instanceId: instanceId,
      position: new THREE.Vector3(x, 0.8, z),
      rotation: new THREE.Euler(0, Math.random() * Math.PI * 2, 0)
    };
  } else {
    console.log('回退到普通网格创建敌人');
    // 回退到普通网格
    const enemyGeometry = new THREE.BoxGeometry(1.5, 0.8, 2.5);
    const enemyMaterial = new THREE.MeshBasicMaterial({ 
      color: 0xff0000, // 明亮的红色
      wireframe: false // 实心显示，更加明显
    });
    enemyMesh = new THREE.Mesh(enemyGeometry, enemyMaterial);
    enemyMesh.position.set(x, 0.8, z);
    enemyMesh.rotation.y = Math.random() * Math.PI * 2;
    scene.add(enemyMesh);
  }
  
  // 创建敌人物理体
  const enemyBody = new CANNON.Body({
    mass: 5,
    position: new CANNON.Vec3(x, 0.8, z),
    shape: new CANNON.Box(new CANNON.Vec3(0.75, 0.4, 1.25))
  });
  world.addBody(enemyBody);
  
  // 标记该物理体为敌人
  (enemyBody as any).userData = { isEnemy: true };
  
  // 记录敌人信息
  enemies.push({
    mesh: enemyMesh,
    body: enemyBody,
    health: 100,
    lastShootTime: 0
  } as any);
  
  console.log('生成敌人，当前敌人数量:', enemies.length);
};

// 更新敌人AI
const updateEnemies = (deltaTime) => {
  // 更新敌人生成计时器
  enemySpawnTimer -= deltaTime;
  if (enemySpawnTimer <= 0 && enemies.length < 5 /* 检查数量避免过度生成 */) {
    spawnEnemy();
    enemySpawnTimer = 3 + Math.random() * 2; // 3-5秒生成一个敌人
  }
  
  // --- 使用反向 for 循环更新敌人 --- 
  for (let index = enemies.length - 1; index >= 0; index--) {
    const enemy = enemies[index];
    if (!tank) return; // 如果玩家坦克不存在，停止更新
    
    // --- 检查敌人健康状态 --- 
    if ((enemy as any).health <= 0) {
      // 敌人被消灭
      console.log(`敌人 ${(enemy.mesh as any).isInstancedMesh ? '实例 ' + (enemy.mesh as any).instanceId : 'Mesh'} 被消灭 (Index: ${index})`);
      createExplosion(enemy.mesh.position.clone());
      playSound(explosionSound);
      
      // 清理敌人渲染模型
      if (!(enemy.mesh as any).isInstancedMesh && enemy.mesh instanceof THREE.Mesh) {
        scene.remove(enemy.mesh);
        console.log('移除普通敌人 Mesh');
      } else if (enemyInstancedMesh && (enemy.mesh as any).isInstancedMesh) {
        // 对于实例化网格，缩放为0来隐藏
        try {
          const matrix = new THREE.Matrix4().makeScale(0, 0, 0);
          enemyInstancedMesh.setMatrixAt((enemy.mesh as any).instanceId, matrix);
          // instanceMatrix.needsUpdate 会在循环外统一设置
          console.log('隐藏敌人实例:', (enemy.mesh as any).instanceId);
        } catch (error) {
          console.error('隐藏敌人实例出错:', error, enemy);
        }
      } else {
        console.warn("无法识别的敌人 Mesh 类型，无法清理渲染模型", enemy.mesh);
      }
      
      // 清理物理实体
      world.removeBody(enemy.body);
      
      // 从数组中移除
      enemies.splice(index, 1);
      
      // 更新分数和动画
      score.value += 100;
      showScoreAnimation(enemy.mesh.position.clone(), 100);

      // 继续处理下一个敌人 (因为是反向循环，splice后继续是安全的)
      continue; 
    }

    // --- 如果敌人未被消灭，则更新其行为 --- 
    const distanceToPlayer = enemy.mesh.position.distanceTo(tank.position);
    const directionToPlayer = new THREE.Vector3().subVectors(tank.position, enemy.mesh.position).normalize();
    
    // 计算目标旋转角度 (Y轴)
    const targetAngle = Math.atan2(directionToPlayer.x, directionToPlayer.z);
    
    // --- 计算移动 --- 
    let newPosition = enemy.mesh.position.clone(); 
    if (distanceToPlayer < 25) { // 靠近玩家时才移动
      let moveDirection = directionToPlayer.clone();
      
      // 简单的避障
      let obstacleAvoidance = new THREE.Vector3();
      for (const obstacle of obstacles) {
        const distanceToObstacle = enemy.mesh.position.distanceTo(obstacle.mesh.position);
        if (distanceToObstacle < 5) { // 避障半径
          const avoidDir = new THREE.Vector3()
            .subVectors(enemy.mesh.position, obstacle.mesh.position)
            .normalize()
            .multiplyScalar(5 - distanceToObstacle); // 距离越近，避开力度越大
          obstacleAvoidance.add(avoidDir);
        }
      }
      if (obstacleAvoidance.lengthSq() > 0) {
        moveDirection.add(obstacleAvoidance.multiplyScalar(0.5)).normalize(); // 混合避障向量
      }
      
      // 计算潜在的新位置
      const moveSpeed = 0.05; // 敌人移动速度
      const potentialNewPosition = enemy.mesh.position.clone().add(
        moveDirection.multiplyScalar(moveSpeed)
      );

      // 再次检查新位置是否会碰撞 (简化检查)
      let validPosition = true;
      const collisionRadius = 1.5 + 1.5; // Enemy radius + obstacle radius
      for (const obstacle of obstacles) {
        if (potentialNewPosition.distanceTo(obstacle.mesh.position) < collisionRadius) {
          validPosition = false;
          break;
        }
      }
      // 检查与玩家的碰撞
      if (validPosition && potentialNewPosition.distanceTo(tank.position) < 3) { // 假设碰撞半径为3
          validPosition = false;
      }

      // 更新位置
      if (validPosition) {
        newPosition.copy(potentialNewPosition);
      }
    }

    // --- 更新虚拟网格和物理实体 --- 
    enemy.mesh.position.copy(newPosition);
    enemy.mesh.rotation.y = targetAngle; // 更新虚拟旋转
    (enemy.body.position as any).copy(newPosition);
    enemy.body.quaternion.setFromEuler(0, targetAngle, 0); // 更新物理旋转
    
    // --- 更新渲染模型（Mesh 或 InstancedMesh） --- 
    if (!(enemy.mesh as any).isInstancedMesh && enemy.mesh instanceof THREE.Mesh) {
      // 普通网格: 直接更新
      enemy.mesh.position.copy(newPosition);
      enemy.mesh.rotation.y = targetAngle; 
    } else if (enemyInstancedMesh && (enemy.mesh as any).isInstancedMesh) {
      // 实例化网格: 更新矩阵
      try {
        const matrix = new THREE.Matrix4();
        matrix.makeRotationY(targetAngle); // 应用旋转
        matrix.setPosition(newPosition);   // 应用位置
        enemyInstancedMesh.setMatrixAt((enemy.mesh as any).instanceId, matrix);
        // instanceMatrix.needsUpdate 会在循环外统一设置
      } catch (error) {
        console.error('更新敌人实例矩阵出错:', error, enemy);
      }
    }
    
    // --- 处理射击 --- 
    if (distanceToPlayer < 20) { // 射击距离
        (enemy as any).lastShootTime -= deltaTime;
        if ((enemy as any).lastShootTime <= 0 && distanceToPlayer > 5 /* 不要离太近射击 */) { 
            fireEnemyBullet(enemy);
            (enemy as any).lastShootTime = 2 + Math.random() * 2; // 2-4秒射击一次
        }
    }
  }
  
  // 在所有实例矩阵更新后，标记 instanceMatrix 需要更新
  if (enemyInstancedMesh && enemies.some(e => (e.mesh as any).isInstancedMesh)) { // 只有在确实有实例时才标记
      enemyInstancedMesh.instanceMatrix.needsUpdate = true;
  }
};

// 敌人射击功能
const fireEnemyBullet = (enemy) => {
  if (!tank) return;
  
  // 检查是否有掩体阻挡射击路径
  const rayStart = enemy.mesh.position.clone();
  rayStart.y = 1; // 从敌人的枪口高度开始
  
  const rayEnd = tank.position.clone();
  rayEnd.y = 1; // 射向玩家的枪口高度
  
  const rayDirection = new THREE.Vector3().subVectors(rayEnd, rayStart).normalize();
  const rayLength = rayStart.distanceTo(rayEnd);
  
  // 简单检查是否有掩体阻挡射击路径
  let blocked = false;
  for (const obstacle of obstacles) {
    // 这是一个简化的射线检测
    const obstaclePosition = obstacle.mesh.position.clone();
    const obstacleToRayStart = new THREE.Vector3().subVectors(obstaclePosition, rayStart);
    
    // 计算射线与障碍物之间的最小距离
    const projection = obstacleToRayStart.dot(rayDirection);
    
    // 只检查射线前方的障碍物
    if (projection > 0 && projection < rayLength) {
      const distance = obstacleToRayStart.clone().sub(rayDirection.clone().multiplyScalar(projection)).length();
      
      // 如果距离小于障碍物半径，认为被阻挡
      if (distance < 2) {
        blocked = true;
        break;
      }
    }
  }
  
  // 如果射击路径被阻挡，敌人不射击
  if (blocked) {
    return;
  }
  
  // 子弹发射方向（朝向玩家）
  const direction = new THREE.Vector3();
  direction.subVectors(tank.position, enemy.mesh.position).normalize();
  
  // 子弹发射位置
  const bulletPosition = enemy.mesh.position.clone().add(
    direction.clone().multiplyScalar(2)
  );
  bulletPosition.y = 1;
  
  // 使用Bullet类创建敌人子弹
  const bullet = new Bullet(scene, world, bulletPosition, direction);
  enemyBullets.push(bullet);
  
  // 创建射击特效
  createMuzzleFlash(bulletPosition.clone(), direction);
};

// 播放震动效果
const playShakeEffect = () => {
  if (!sceneContainer.value) return;
  
  // 添加震动class
  sceneContainer.value.classList.add('shake');
  
  // 震动结束后移除class
  setTimeout(() => {
    if (sceneContainer.value) {
      sceneContainer.value.classList.remove('shake');
    }
  }, 500);
};

// 玩家受伤处理
const damagePlayer = (amount) => {
  health.value -= amount;
  
  // 播放震动效果
  playShakeEffect();
  
  // 检查游戏结束
  if (health.value <= 0) {
    health.value = 0;
    endGame();
  }
};

// 检查碰撞检测 - 更新版本
const checkCollisions = () => {
  // 检查玩家子弹与敌人碰撞
  for (let i = bullets.length - 1; i >= 0; i--) {
    const bullet = bullets[i];
    
    // 检查子弹是否击中敌人
    for (let j = enemies.length - 1; j >= 0; j--) {
      const enemy = enemies[j];
      const distance = bullet.mesh.position.distanceTo(enemy.mesh.position);
      
      if (distance < 2) { // 简单的距离检测
        // 敌人受伤
        (enemy as any).health -= 50;
        
        // 显示得分动画
        showScoreAnimation(enemy.mesh.position.clone(), 50);
        
        // 移除子弹
        scene.remove(bullet.mesh);
        bullets.splice(i, 1);
        
        // 创建命中特效
        createHitEffect(enemy.mesh.position.clone());
        break;
      }
    }
  }
  
  // 检查敌人子弹与玩家碰撞
  for (let i = enemyBullets.length - 1; i >= 0; i--) {
    const bullet = enemyBullets[i];
    
    if (tank) {
      const distance = bullet.mesh.position.distanceTo(tank.position);
      
      if (distance < 2) { // 简单的距离检测
        // 玩家受伤
        damagePlayer(10);
        
        // 移除子弹
        scene.remove(bullet.mesh);
        enemyBullets.splice(i, 1);
        
        // 创建命中特效
        createHitEffect(tank.position.clone());
        break;
      }
    }
  }
  
  // 检测坦克与敌人碰撞
  if (tank) {
    for (let i = enemies.length - 1; i >= 0; i--) {
      const enemy = enemies[i];
      const distance = tank.position.distanceTo(enemy.mesh.position);
      
      if (distance < 3) { // 坦克碰撞检测
        // 玩家受到碰撞伤害
        damagePlayer(1); // 每帧少量伤害
        
        // 轻微推开敌人
        const pushDirection = new THREE.Vector3();
        pushDirection.subVectors(enemy.mesh.position, tank.position).normalize();
        enemy.mesh.position.add(pushDirection.multiplyScalar(0.1));
        (enemy.body.position as any).copy(enemy.mesh.position);
      }
    }
  }
};

// 更新所有子弹
const updateBullets = (deltaTime) => {
  // 更新玩家子弹
  for (let i = bullets.length - 1; i >= 0; i--) {
    const bullet = bullets[i];
    
    // 更新子弹
    bullet.update(deltaTime);
    
    // 检查子弹是否应该销毁
    if (!bullet.isActive) {
      bullet.destroy(scene, world);
      bullets.splice(i, 1);
      continue; // 跳过后续检查
    }
    
    // 检查子弹是否击中掩体
    let hitObstacle = false;
    for (const obstacle of obstacles) {
      const distance = bullet.mesh.position.distanceTo(obstacle.mesh.position);
      if (distance < 2) { // 简单的距离碰撞检测
        // 创建命中特效
        createHitEffect(bullet.mesh.position.clone());
        
        // 移除子弹
        bullet.destroy(scene, world);
        bullets.splice(i, 1);
        
        hitObstacle = true;
        break;
      }
    }
    
    if (hitObstacle) continue; // 如果已经击中掩体，跳过后续检查
    
    // 检查子弹是否击中敌人
    for (let j = enemies.length - 1; j >= 0; j--) {
      const enemy = enemies[j];
      const distance = bullet.mesh.position.distanceTo(enemy.mesh.position);
      
      if (distance < 2) { // 简单的距离检测
        // 敌人受伤
        (enemy as any).health -= 50;
        
        // 显示得分动画
        showScoreAnimation(enemy.mesh.position.clone(), 50);
        
        // 移除子弹
        bullet.destroy(scene, world);
        bullets.splice(i, 1);
        
        // 创建命中特效
        createHitEffect(enemy.mesh.position.clone());
        break;
      }
    }
  }
  
  // 更新敌人子弹
  for (let i = enemyBullets.length - 1; i >= 0; i--) {
    const bullet = enemyBullets[i];
    
    // 更新子弹
    bullet.update(deltaTime);
    
    // 检查子弹是否应该销毁
    if (!bullet.isActive) {
      bullet.destroy(scene, world);
      enemyBullets.splice(i, 1);
      continue; // 跳过后续检查
    }
    
    // 检查子弹是否击中掩体
    let hitObstacle = false;
    for (const obstacle of obstacles) {
      const distance = bullet.mesh.position.distanceTo(obstacle.mesh.position);
      if (distance < 2) { // 简单的距离碰撞检测
        // 创建命中特效
        createHitEffect(bullet.mesh.position.clone());
        
        // 移除子弹
        bullet.destroy(scene, world);
        enemyBullets.splice(i, 1);
        
        hitObstacle = true;
        break;
      }
    }
    
    if (hitObstacle) continue; // 如果已经击中掩体，跳过后续检查
    
    // 检查敌人子弹是否击中玩家
    if (tank) {
      const distance = bullet.mesh.position.distanceTo(tank.position);
      
      if (distance < 2) { // 简单的距离检测
        // 玩家受伤
        damagePlayer(10);
        
        // 移除子弹
        bullet.destroy(scene, world);
        enemyBullets.splice(i, 1);
        
        // 创建命中特效
        createHitEffect(tank.position.clone());
      }
    }
  }
};

// 射击特效 - 枪口闪光
const createMuzzleFlash = (position, direction) => {
  // 创建枪口闪光点光源
  const flash = new THREE.PointLight(0xff6600, 5, 3);
  flash.position.copy(position);
  flash.position.add(direction.clone().multiplyScalar(1)); // 在枪口位置前方
  scene.add(flash);
  
  // 创建闪光几何体
  const flashGeometry = new THREE.SphereGeometry(0.3, 8, 8);
  const flashMaterial = new THREE.MeshBasicMaterial({
    color: 0xff9900,
    transparent: true,
    opacity: 0.8
  });
  const flashMesh = new THREE.Mesh(flashGeometry, flashMaterial);
  flashMesh.position.copy(flash.position);
  scene.add(flashMesh);
  
  // 闪光淡出动画
  let intensity = 5;
  const animateFlash = () => {
    if (intensity <= 0) {
      scene.remove(flash);
      scene.remove(flashMesh);
      return;
    }
    
    intensity -= 0.5;
    flash.intensity = intensity;
    flashMaterial.opacity = intensity / 5;
    flashMesh.scale.multiplyScalar(0.9);
    
    requestAnimationFrame(animateFlash);
  };
  
  animateFlash();
};

// 增强版爆炸效果
const createExplosion = (position) => {
  // 爆炸闪光
  const explosionLight = new THREE.PointLight(0xff5500, 5, 8);
  explosionLight.position.copy(position);
  scene.add(explosionLight);
  
  // 粒子系统 - 爆炸效果
  const particleCount = 50;
  const particles = new THREE.BufferGeometry();
  
  // 创建粒子初始位置和颜色
  const positions = new Float32Array(particleCount * 3);
  const colors = new Float32Array(particleCount * 3);
  
  // 设置粒子位置和颜色
  for (let i = 0; i < particleCount; i++) {
    // 位置 - 随机扩散
    positions[i * 3] = position.x;
    positions[i * 3 + 1] = position.y;
    positions[i * 3 + 2] = position.z;
    
    // 颜色 - 火焰色谱，从黄到红
    colors[i * 3] = 1;  // 红
    colors[i * 3 + 1] = Math.random() * 0.7;  // 绿 - 偏黄
    colors[i * 3 + 2] = 0;  // 蓝
  }
  
  // 设置粒子属性
  particles.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  particles.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  
  // 粒子材质 - 更亮更大的粒子
  const particleMaterial = new THREE.PointsMaterial({
    size: 0.7,
    vertexColors: true,
    transparent: true,
    opacity: 1.0,
    blending: THREE.AdditiveBlending // 加法混合使粒子看起来更明亮
  });
  
  // 创建粒子系统
  const particleSystem = new THREE.Points(particles, particleMaterial);
  scene.add(particleSystem);
  
  // 粒子速度 - 更快更爆炸性
  const velocities: Array<{x: number, y: number, z: number}> = [];
  for (let i = 0; i < particleCount; i++) {
    // 随机方向，速度更快
    velocities.push({
      x: (Math.random() - 0.5) * 0.3,
      y: Math.random() * 0.3 + 0.1, // 向上偏移更多
      z: (Math.random() - 0.5) * 0.3
    });
  }
  
  // 增加烟雾效果
  const smokeCount = 20;
  const smokeGeometry = new THREE.BufferGeometry();
  const smokePositions = new Float32Array(smokeCount * 3);
  
  for (let i = 0; i < smokeCount; i++) {
    smokePositions[i * 3] = position.x + (Math.random() - 0.5) * 0.5;
    smokePositions[i * 3 + 1] = position.y + Math.random() * 0.5;
    smokePositions[i * 3 + 2] = position.z + (Math.random() - 0.5) * 0.5;
  }
  
  smokeGeometry.setAttribute('position', new THREE.BufferAttribute(smokePositions, 3));
  
  const smokeMaterial = new THREE.PointsMaterial({
    size: 1.0,
    color: 0x333333,
    transparent: true,
    opacity: 0.7
  });
  
  const smokeSystem = new THREE.Points(smokeGeometry, smokeMaterial);
  scene.add(smokeSystem);
  
  // 烟雾速度
  const smokeVelocities: Array<{x: number, y: number, z: number}> = [];
  for (let i = 0; i < smokeCount; i++) {
    smokeVelocities.push({
      x: (Math.random() - 0.5) * 0.1,
      y: Math.random() * 0.1,
      z: (Math.random() - 0.5) * 0.1
    });
  }
  
  // 震动屏幕
  playShakeEffect();
  
  // 更新粒子系统
  let time = 0;
  const animateExplosion = () => {
    time += 0.016; // 约16ms，60fps
    
    // 更新爆炸光照
    explosionLight.intensity = Math.max(0, 5 - time * 5);
    
    // 如果爆炸结束，清理并返回
    if (time > 1.5) {
      scene.remove(particleSystem);
      scene.remove(smokeSystem);
      scene.remove(explosionLight);
      particleSystem.geometry.dispose();
      particleMaterial.dispose();
      smokeGeometry.dispose();
      smokeMaterial.dispose();
      return;
    }
    
    // 粒子运动
    const positions = particleSystem.geometry.attributes.position.array;
    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] += (velocities[i] as any).x;
      positions[i * 3 + 1] += (velocities[i] as any).y;
      positions[i * 3 + 2] += (velocities[i] as any).z;
      
      // 粒子逐渐减速
      (velocities[i] as any).y -= 0.01; // 重力效果
    }
    particleSystem.geometry.attributes.position.needsUpdate = true;
    
    // 烟雾运动 - 缓慢上升
    const smokePositions = smokeSystem.geometry.attributes.position.array;
    for (let i = 0; i < smokeCount; i++) {
      smokePositions[i * 3] += (smokeVelocities[i] as any).x;
      smokePositions[i * 3 + 1] += (smokeVelocities[i] as any).y;
      smokePositions[i * 3 + 2] += (smokeVelocities[i] as any).z;
    }
    smokeSystem.geometry.attributes.position.needsUpdate = true;
    
    // 粒子系统淡出
    particleMaterial.opacity = Math.max(0, 1 - time / 1.0);
    smokeMaterial.opacity = Math.max(0, 0.7 - time / 2.0); // 烟雾持续更久
    
    requestAnimationFrame(animateExplosion);
  };
  
  // 开始动画
  animateExplosion();
};

// 命中特效 - 简单闪光
const createHitEffect = (position) => {
  // 播放命中声音
  playSound(hitSound);
  
  const hitGeometry = new THREE.SphereGeometry(0.5, 8, 8);
  const hitMaterial = new THREE.MeshBasicMaterial({
    color: 0xffff00,
    transparent: true,
    opacity: 1.0
  });
  
  const hitMesh = new THREE.Mesh(hitGeometry, hitMaterial);
  hitMesh.position.copy(position);
  scene.add(hitMesh);
  
  // 淡出动画
  let scale = 1.0;
  const animateHit = () => {
    if (!scene.children.includes(hitMesh)) return;
    
    scale += 0.1;
    hitMesh.scale.set(scale, scale, scale);
    hitMaterial.opacity -= 0.05;
    
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

// 得分显示动画
const showScoreAnimation = (position, points) => {
  // 创建得分HTML元素
  const scoreElem = document.createElement('div');
  scoreElem.className = 'score-popup';
  scoreElem.textContent = `+${points}`;
  
  // 计算屏幕位置
  const screenPosition = worldToScreen(position);
  
  // 设置位置
  scoreElem.style.left = `${screenPosition.x}px`;
  scoreElem.style.top = `${screenPosition.y}px`;
  
  // 添加到DOM
  document.body.appendChild(scoreElem);
  
  // 淡出和上移动画
  setTimeout(() => {
    scoreElem.style.opacity = '0';
    scoreElem.style.transform = 'translateY(-50px)';
  }, 100);
  
  // 移除元素
  setTimeout(() => {
    if (document.body.contains(scoreElem)) {
      document.body.removeChild(scoreElem);
    }
  }, 1000);
};

// 3D世界坐标转屏幕坐标
const worldToScreen = (position) => {
  const vector = new THREE.Vector3();
  vector.copy(position);
  
  // 将世界坐标投影到屏幕
  vector.project(camera);
  
  // 转换为屏幕坐标
  const x = (vector.x * 0.5 + 0.5) * window.innerWidth;
  const y = (-vector.y * 0.5 + 0.5) * window.innerHeight;
  
  return { x, y };
};

// 查找场景中的所有网格助手并控制其可见性
const updateGridHelperVisibility = () => {
  scene.traverse((obj) => {
    if (obj instanceof THREE.GridHelper) {
      obj.visible = showGrid.value;
    }
  });
};

// 创建随机掩体
const createObstacles = (count: number) => {
  console.log(`创建${count}个掩体...`);
  
  // 创建掩体纹理加载器
  const textureLoader = new THREE.TextureLoader();
  
  // 尝试加载掩体纹理
  textureLoader.load('/textures/obstacle_texture.jpg', (texture) => {
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    
    // 创建基础的掩体几何体和材质
    const obstacleGeometry = new THREE.BoxGeometry(3, 2, 3);
    const obstacleMaterial = new THREE.MeshStandardMaterial({
      map: texture,
      metalness: 0.2,
      roughness: 0.8
    });
    
    // 在场景中随机生成掩体
    for (let i = 0; i < count; i++) {
      // 随机位置（避开玩家初始位置）
      let x, z, distanceFromPlayer;
      do {
        x = (Math.random() - 0.5) * 80; // -40 到 40 之间
        z = (Math.random() - 0.5) * 80; // -40 到 40 之间
        distanceFromPlayer = Math.sqrt(x * x + z * z);
      } while (distanceFromPlayer < 10); // 确保与玩家有一定距离
      
      // 创建掩体网格
      const obstacle = new THREE.Mesh(obstacleGeometry, obstacleMaterial);
      obstacle.position.set(x, 1, z); // 设置掩体高度为1（一半高度）
      obstacle.rotation.y = Math.random() * Math.PI * 2; // 随机旋转
      scene.add(obstacle);
      
      // 创建掩体物理体
      const obstacleShape = new CANNON.Box(new CANNON.Vec3(1.5, 1, 1.5)); // 半尺寸
      const obstacleBody = new CANNON.Body({
        mass: 0, // 静态物体，质量为0
        position: new CANNON.Vec3(x, 1, z),
        shape: obstacleShape
      });
      
      obstacleBody.quaternion.setFromEuler(0, obstacle.rotation.y, 0);
      world.addBody(obstacleBody);
      
      // 记录掩体信息
      obstacles.push({
        mesh: obstacle,
        body: obstacleBody
      });
    }
    
    console.log(`成功创建${obstacles.length}个掩体`);
  }, undefined, (err) => {
    console.warn('无法加载掩体纹理，使用基本材质:', err);
    
    // 使用基本材质创建掩体
    const obstacleGeometry = new THREE.BoxGeometry(3, 2, 3);
    const obstacleMaterial = new THREE.MeshBasicMaterial({ 
      color: 0x8B4513, // 棕色
      wireframe: false
    });
    
    // 在场景中随机生成掩体
    for (let i = 0; i < count; i++) {
      // 随机位置（避开玩家初始位置）
      let x, z, distanceFromPlayer;
      do {
        x = (Math.random() - 0.5) * 80; // -40 到 40 之间
        z = (Math.random() - 0.5) * 80; // -40 到 40 之间
        distanceFromPlayer = Math.sqrt(x * x + z * z);
      } while (distanceFromPlayer < 10); // 确保与玩家有一定距离
      
      // 创建掩体网格
      const obstacle = new THREE.Mesh(obstacleGeometry, obstacleMaterial);
      obstacle.position.set(x, 1, z); // 设置掩体高度为1（一半高度）
      obstacle.rotation.y = Math.random() * Math.PI * 2; // 随机旋转
      scene.add(obstacle);
      
      // 创建掩体物理体
      const obstacleShape = new CANNON.Box(new CANNON.Vec3(1.5, 1, 1.5)); // 半尺寸
      const obstacleBody = new CANNON.Body({
        mass: 0, // 静态物体，质量为0
        position: new CANNON.Vec3(x, 1, z),
        shape: obstacleShape
      });
      
      obstacleBody.quaternion.setFromEuler(0, obstacle.rotation.y, 0);
      world.addBody(obstacleBody);
      
      // 记录掩体信息
      obstacles.push({
        mesh: obstacle,
        body: obstacleBody
      });
    }
    
    console.log(`成功创建${obstacles.length}个掩体（基本材质）`);
  });
};

// 组件挂载时初始化
onMounted(() => {
  console.log('组件挂载');
  
  // 立即初始化场景，但不启动游戏动画
  initScene();
  
  if (webGLSupported.value) {
    // 添加键盘事件监听
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    // 添加 Pointer Lock 事件监听
    document.addEventListener('pointerlockchange', onPointerLockChange, false);
    document.addEventListener('mozpointerlockchange', onPointerLockChange, false);
    document.addEventListener('webkitpointerlockchange', onPointerLockChange, false);
    document.addEventListener('pointerlockerror', onPointerLockError, false);
    document.addEventListener('mozpointerlockerror', onPointerLockError, false);
    document.addEventListener('webkitpointerlockerror', onPointerLockError, false);

    // 添加 ESC 键释放指针锁定
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && pointerLocked.value) {
        document.exitPointerLock();
      }
    });
    
    // 设置初始时间
    lastTime = performance.now();
    
    // 渲染一帧静态场景，但不开始游戏循环
    // 游戏循环将在用户点击"开始游戏"按钮后启动
    if (renderer && scene && camera) {
      renderer.render(scene, camera);
    }
  }
});

// 组件卸载前清理
onBeforeUnmount(() => {
  // 清理事件监听
  window.removeEventListener('resize', onWindowResize);
  window.removeEventListener('keydown', handleKeyDown);
  window.removeEventListener('keyup', handleKeyUp);
  // 移除 document 上的 mousemove
  document.removeEventListener('mousemove', handleMouseMove);

  // 清理 Pointer Lock 事件监听
  document.removeEventListener('pointerlockchange', onPointerLockChange, false);
  document.removeEventListener('mozpointerlockchange', onPointerLockChange, false);
  document.removeEventListener('webkitpointerlockchange', onPointerLockChange, false);
  document.removeEventListener('pointerlockerror', onPointerLockError, false);
  document.removeEventListener('mozpointerlockerror', onPointerLockError, false);
  document.removeEventListener('webkitpointerlockerror', onPointerLockError, false);
  
  // 清理鼠标事件监听
  if (renderer && renderer.domElement) {
    // renderer.domElement.removeEventListener('mousedown', handleMouseDown); // 移除旧的清理
    renderer.domElement.removeEventListener('mouseup', handleMouseUp); // 这个还在renderer上？不对，mouseup也改到document了
    // renderer.domElement.removeEventListener('mousemove', handleMouseMove); // 已移至window
    renderer.domElement.removeEventListener('click', handleCanvasClick);
  }
  // 移除 document 上的 mouseup 监听
  document.removeEventListener('mouseup', handleMouseUp);
  // 移除 document 上的 mousedown 监听
  document.removeEventListener('mousedown', handleMouseDown); 
  
  // 取消动画帧
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId);
  }
  
  // 停止所有声音
  if (engineSound) {
    engineSound.pause();
    engineSound.currentTime = 0;
  }
  
  // 清理渲染器
  if (sceneContainer.value && renderer) {
    sceneContainer.value.removeChild(renderer.domElement);
  }
  
  // 清理资源
  if (scene) {
    // 遍历场景中的所有对象并清理
    scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        if (object.geometry) {
          object.geometry.dispose();
        }
        
        if (object.material) {
          if (Array.isArray(object.material)) {
            object.material.forEach(material => material.dispose());
          } else {
            object.material.dispose();
          }
        }
      }
    });
    
    // 清空场景
    while (scene.children.length > 0) {
      scene.remove(scene.children[0]);
    }
  }
  
  // 清理物理世界
  if (world) {
    // 移除所有物理体
    while (world.bodies.length > 0) {
      world.removeBody(world.bodies[0]);
    }
  }
});

// 更新相机跟随坦克，修改为鼠标控制TPS风格
const updateCamera = () => {
  if (!tank || !camera) return;

  // 计算相机观察目标的偏移量（看向坦克中心偏上一点）
  const lookAtOffset = new THREE.Vector3(0, 1, 0); 
  const lookAtPosition = tank.position.clone().add(lookAtOffset);

  // --- 计算相机基于角度和距离的位置 ---
  const offsetX = followDistance * Math.sin(cameraAngleH.value) * Math.cos(cameraAngleV.value);
  const offsetY = followDistance * Math.sin(cameraAngleV.value);
  const offsetZ = followDistance * Math.cos(cameraAngleH.value) * Math.cos(cameraAngleV.value);
  
  const cameraOffset = new THREE.Vector3(offsetX, offsetY, offsetZ);

  // 计算相机的理想世界坐标
  const idealPosition = tank.position.clone().add(cameraOffset);

  // --- 简单的视线遮挡检查 (可选，但推荐) ---
  const raycaster = new THREE.Raycaster();
  const direction = new THREE.Vector3().subVectors(idealPosition, lookAtPosition).normalize();
  raycaster.set(lookAtPosition, direction);
  raycaster.far = followDistance; // 只检查相机和坦克之间的距离

  // 获取可能阻挡视线的物体 (只检查障碍物)
  const intersects = raycaster.intersectObjects(obstacles.map(o => o.mesh)); 

  let finalCameraPosition = idealPosition;
  if (intersects.length > 0) {
    // 如果有遮挡，将相机拉近到最近的碰撞点再往后一点点
    finalCameraPosition = intersects[0].point.clone().add(direction.multiplyScalar(-0.5)); // 稍微后退避免穿模
    console.log("相机视线被遮挡，拉近相机");
  }

  // 使用lerp平滑过渡相机位置
  camera.position.lerp(finalCameraPosition, cameraLerpFactor); 

  // 始终让相机看向目标点
  camera.lookAt(lookAtPosition);

  // 移除旧的 OrbitControls/thirdPersonView 相关逻辑
  // if (thirdPersonView.value) { ... } else { ... }
  // controls.update(); // 移除
};

// 开始游戏
const startGame = () => {
  gameStarted.value = true;
  showHelp.value = false; // 关闭帮助面板
  
  // 设置初始时间
  lastTime = performance.now();
  
  // 开始动画循环
  animate();
  
  // 播放引擎声音
  if (engineSound) {
    try {
      engineSound.play().catch(e => {
        console.warn('引擎声音播放失败:', e);
      });
    } catch (e) {
      console.warn('播放引擎声音出错:', e);
    }
  }
};

// 处理鼠标按下事件
const handleMouseDown = (event) => {
  console.log('[MouseDown] Triggered. Button:', event.button, 'Current mouseDown.value:', mouseDown.value); // 添加日志
  // 如果帮助面板打开、游戏暂停、未开始游戏或游戏结束，不处理鼠标事件
  if (showHelp.value || !gameStarted.value || gameOver.value || isPaused.value) {
    console.log('[MouseDown] Blocked by game state.'); // 添加日志
    return;
  }
  
  // 检查是否为左键
  if (event.button === 0) {
    console.log('[MouseDown] Left button pressed. Setting mouseDown.value = true'); // 添加日志
    mouseDown.value = true;
    
    // 记录当前鼠标位置
    mousePosition.lastX = event.clientX;
    mousePosition.lastY = event.clientY;
    
    // 启用鼠标控制
    isMouseControlEnabled.value = true;
    
    console.log('[MouseDown] Calling fireSimpleBullet() immediately.'); // 添加日志
    // 立即射击一次，不等待间隔
    fireSimpleBullet();
    lastShootTime.value = shootInterval; // 重置射击计时器

    // --- 同时请求指针锁定 --- 
    if (sceneContainer.value && !pointerLocked.value) {
      console.log('请求指针锁定 (from mousedown)');
      sceneContainer.value.requestPointerLock = sceneContainer.value.requestPointerLock ||
                                             (sceneContainer.value as any).mozRequestPointerLock ||
                                             (sceneContainer.value as any).webkitRequestPointerLock;
      if (sceneContainer.value.requestPointerLock) {
          sceneContainer.value.requestPointerLock();
      } else {
          console.warn('浏览器不支持 Pointer Lock API');
      }
    }
    // --- 结束指针锁定请求 ---
  }
};

// 处理鼠标松开事件
const handleMouseUp = (event) => {
  console.log('[MouseUp] Triggered. Button:', event.button, 'Current mouseDown.value:', mouseDown.value); // 添加日志
  // 检查是否为左键
  if (event.button === 0) {
    console.log('[MouseUp] Left button released. Setting mouseDown.value = false'); // 添加日志
    mouseDown.value = false;
  }
};

// 处理鼠标移动事件 - 实现视角旋转 (仅水平)
const handleMouseMove = (event) => {
  // 仅在指针锁定时处理
  if (!pointerLocked.value || isPaused.value || !gameStarted.value || gameOver.value) {
    return;
  }

  // 获取鼠标移动增量 (兼容不同浏览器)
  const movementX = event.movementX || (event as any).mozMovementX || (event as any).webkitMovementX || 0;
  // const movementY = event.movementY || (event as any).mozMovementY || (event as any).webkitMovementY || 0; // 忽略 Y 轴移动

  // 更新水平角度 (左右移动)
  cameraAngleH.value -= movementX * mouseSensitivity;
  // 保持角度在 0 到 2PI 之间 (可选)
  // cameraAngleH.value %= (Math.PI * 2); 

  // // 更新垂直角度 (上下移动) -- 移除此部分
  // cameraAngleV.value -= movementY * mouseSensitivity;

  // // 限制垂直角度范围，防止视角翻转 -- 移除此部分
  // cameraAngleV.value = Math.max(minVerticalAngle, Math.min(maxVerticalAngle, cameraAngleV.value));

  // console.log(`Mouse Move: dX=${movementX}, H=${cameraAngleH.value.toFixed(2)}, V=${cameraAngleV.value.toFixed(2)} (Locked)`);
};

// 处理画布点击事件 - 请求指针锁定 (现在此函数不再需要处理指针锁定了)
const handleCanvasClick = (event) => {
  // 如果帮助面板打开或游戏未开始/结束/暂停，不处理
  if (showHelp.value || !gameStarted.value || gameOver.value || isPaused.value) {
    return;
  }

  // --- 移除之前注释掉的指针锁定逻辑 --- 

  // // 点击屏幕也尝试射击 (如果冷却完成) -- 移除此逻辑
  // // (注意：mousedown 事件也会触发射击，这里是补充)
  // const currentTime = performance.now() / 1000;
  // if (currentTime - lastShootTime.value >= shootInterval && !mouseDown.value /* 避免 mousedown 和 click 同时触发两次 */) {
  //     console.log('Click Firing');
  //     fireSimpleBullet();
  //     lastShootTime.value = currentTime;
  // }
};

// 启用替代鼠标控制方案
const useAlternativeMouseControl = () => {
  console.log('使用替代鼠标控制方案');
  
  // 标记为使用替代控制
  pointerLocked.value = false;
  
  // 告知用户
  showNotification('使用替代鼠标控制：拖动鼠标改变视角');
};

// 显示临时通知
const showNotification = (message) => {
  const notification = document.createElement('div');
  notification.className = 'game-notification';
  notification.textContent = message;
  
  document.body.appendChild(notification);
  
  // 3秒后自动消失
  setTimeout(() => {
    if (document.body.contains(notification)) {
      document.body.removeChild(notification);
    }
  }, 3000);
};

// 启用鼠标控制
const enableMouseControl = () => {
  console.log('启用鼠标控制');
  
  // 添加额外的鼠标事件处理
  if (sceneContainer.value) {
    // 使用mousedown而不是click以减少延迟
    sceneContainer.value.style.cursor = 'none'; // 隐藏鼠标
    
    // 记录鼠标初始位置，用于计算拖动距离
    mousePosition.lastX = window.innerWidth / 2;
    mousePosition.lastY = window.innerHeight / 2;
  }
};

// 监听指针锁定状态变化
const onPointerLockChange = () => {
  if (document.pointerLockElement === sceneContainer.value ||
      (document as any).mozPointerLockElement === sceneContainer.value ||
      (document as any).webkitPointerLockElement === sceneContainer.value) {
    // 指针已锁定
    console.log('指针已锁定');
    pointerLocked.value = true;
    if(sceneContainer.value) sceneContainer.value.style.cursor = 'none';
    // (可选) 重置鼠标位置，避免锁定/解锁时的跳跃
    mousePosition.lastX = window.innerWidth / 2;
    mousePosition.lastY = window.innerHeight / 2;
  } else {
    // 指针已释放
    console.log('指针已释放');
    pointerLocked.value = false;
    if(sceneContainer.value) sceneContainer.value.style.cursor = 'auto';
    // (可选) 可以在此暂停游戏或执行其他逻辑
  }
};

// 处理指针锁定错误
const onPointerLockError = (e) => {
  console.error('指针锁定错误:', e);
  pointerLocked.value = false; // 确保状态正确
  if(sceneContainer.value) sceneContainer.value.style.cursor = 'auto';
};

// 帮助面板中添加新的控制说明
const updateHelpContent = () => {
  if (showHelp.value) {
    // 更新控制说明
    console.log('更新控制说明');
  }
};
</script>

<style scoped>
.scene-container {
  width: 100%;
  height: 100vh;
  overflow: hidden;
  position: absolute;
  top: 0;
  left: 0;
  background-color: #87CEEB;
}

.game-info {
  position: absolute;
  top: 20px;
  left: 20px;
  padding: 10px 15px;
  background-color: rgba(52, 65, 73, 0.7);
  color: white;
  font-size: 16px;
  border-radius: 4px;
  z-index: 100;
  min-width: 180px;
  backdrop-filter: blur(3px);
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.health-container {
  margin-top: 5px;
}

.health-bar-bg {
  width: 100%;
  height: 15px;
  background-color: rgba(0, 0, 0, 0.4);
  border-radius: 8px;
  margin-top: 5px;
  overflow: hidden;
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(0, 0, 0, 0.5);
}

.health-bar {
  height: 100%;
  background: linear-gradient(to right, #f00, #ff0, #0f0);
  border-radius: 6px;
  transition: width 0.3s ease-out;
  box-shadow: 0 0 5px rgba(0, 255, 0, 0.5);
}

.controls-info {
  position: absolute;
  top: 20px;
  right: 20px;
  padding: 10px 15px;
  background-color: rgba(52, 65, 73, 0.7);
  color: white;
  font-size: 14px;
  border-radius: 4px;
  z-index: 100;
  text-align: left;
  backdrop-filter: blur(3px);
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.controls-info h3 {
  margin-top: 0;
  margin-bottom: 8px;
  font-size: 16px;
  font-weight: bold;
  color: #ffcc00;
}

.controls-info p {
  margin: 4px 0;
}

.key-active {
  color: #4CAF50;
  font-weight: bold;
  text-shadow: 0 0 5px rgba(76, 175, 80, 0.7);
  transform: scale(1.2);
  transition: all 0.1s ease;
  display: inline-block;
  background-color: rgba(255, 255, 255, 0.2);
  padding: 0 4px;
  border-radius: 3px;
}

.webgl-error {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background-color: rgba(255, 0, 0, 0.8);
  color: white;
  padding: 20px 40px;
  border-radius: 10px;
  text-align: center;
  z-index: 1000;
}

.score, .health-label {
  margin: 5px 0;
  font-weight: normal;
}

.score {
  font-size: 20px;
  font-weight: bold;
  color: #ffcc00;
  text-shadow: 0 0 3px rgba(255, 204, 0, 0.5);
}

.game-over {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background-color: rgba(52, 73, 84, 0.9);
  color: white;
  padding: 20px 40px;
  border-radius: 8px;
  text-align: center;
  z-index: 100;
  backdrop-filter: blur(10px);
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.1);
  min-width: 300px;
}

.game-over h2 {
  font-size: 36px;
  margin-bottom: 10px;
  color: #ff5555;
  text-shadow: 0 0 10px rgba(255, 0, 0, 0.5);
}

.game-over button {
  background-color: #4CAF50;
  border: none;
  color: white;
  padding: 12px 24px;
  margin-top: 20px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 18px;
  font-weight: bold;
  box-shadow: 0 3px 5px rgba(0, 0, 0, 0.2);
  transition: all 0.2s ease;
}

.game-over button:hover {
  background-color: #45a049;
  transform: translateY(-2px);
  box-shadow: 0 5px 10px rgba(0, 0, 0, 0.3);
}

.game-over button:active {
  transform: translateY(1px);
  box-shadow: 0 2px 3px rgba(0, 0, 0, 0.3);
}

/* 得分弹出动画 */
.score-popup {
  position: absolute;
  color: #ffff00;
  font-size: 24px;
  font-weight: bold;
  text-shadow: 0 0 5px rgba(0, 0, 0, 0.8);
  pointer-events: none;
  transition: all 1s ease-out;
  z-index: 1000;
  animation: score-float 1s ease-out forwards;
}

@keyframes score-float {
  0% {
    transform: scale(0.5) translateY(0);
    opacity: 0;
  }
  20% {
    transform: scale(1.4) translateY(-10px);
    opacity: 1;
  }
  100% {
    transform: scale(1) translateY(-50px);
    opacity: 0;
  }
}

/* 爆炸震动效果 */
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  10%, 30%, 50%, 70%, 90% { transform: translate(-7px, 3px); }
  20%, 40%, 60%, 80% { transform: translate(7px, -3px); }
}

.shake {
  animation: shake 0.5s cubic-bezier(.36,.07,.19,.97) both;
}

.help-button {
  position: absolute;
  bottom: 20px;
  right: 20px;
  background-color: rgba(52, 65, 73, 0.7);
  color: white;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 100;
  font-size: 24px;
  font-weight: bold;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
  transition: all 0.2s ease;
}

.help-button:hover {
  background-color: rgba(76, 175, 80, 0.8);
  transform: scale(1.1);
}

.help-panel {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background-color: rgba(52, 65, 73, 0.9);
  color: white;
  padding: 20px;
  border-radius: 8px;
  z-index: 100;
  max-width: 500px;
  max-height: 80vh;
  overflow-y: auto;
  backdrop-filter: blur(10px);
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.help-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.help-header h2 {
  font-size: 24px;
  margin: 0;
}

.close-btn {
  background-color: rgba(255, 255, 255, 0.2);
  border: none;
  color: white;
  padding: 5px 10px;
  border-radius: 4px;
  cursor: pointer;
}

.help-content {
  line-height: 1.6;
}

.help-section {
  margin-bottom: 20px;
}

.help-section h3 {
  font-size: 18px;
  margin-bottom: 10px;
}

.help-section ul {
  padding-left: 20px;
}

.help-section li {
  margin-bottom: 5px;
}

.game-start {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background-color: rgba(52, 73, 84, 0.9);
  color: white;
  padding: 30px 40px;
  border-radius: 8px;
  text-align: center;
  z-index: 100;
  backdrop-filter: blur(10px);
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.1);
  min-width: 350px;
}

.game-start h1 {
  font-size: 42px;
  margin-bottom: 15px;
  color: #ffcc00;
  text-shadow: 0 0 10px rgba(255, 204, 0, 0.5);
}

.game-description {
  font-size: 18px;
  margin-bottom: 25px;
  line-height: 1.4;
}

.start-button {
  background-color: #4CAF50;
  border: none;
  color: white;
  padding: 15px 30px;
  margin-top: 10px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 20px;
  font-weight: bold;
  box-shadow: 0 3px 5px rgba(0, 0, 0, 0.2);
  transition: all 0.2s ease;
}

.start-button:hover {
  background-color: #45a049;
  transform: translateY(-2px);
  box-shadow: 0 5px 10px rgba(0, 0, 0, 0.3);
}

.start-button:active {
  transform: translateY(1px);
  box-shadow: 0 2px 3px rgba(0, 0, 0, 0.3);
}

.tip {
  color: #aaddff;
  margin-top: 15px;
  font-size: 16px;
}

/* 暂停游戏提示 */
.pause-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  color: white;
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.pause-overlay h2 {
  font-size: 48px;
  margin-bottom: 20px;
}

.pause-overlay p {
  font-size: 24px;
}

/* 游戏通知样式 */
:global(.game-notification) {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background-color: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 15px 25px;
  border-radius: 5px;
  font-size: 18px;
  z-index: 1100;
  animation: fadeInOut 3s ease-in-out;
}

@keyframes fadeInOut {
  0% { opacity: 0; }
  10% { opacity: 1; }
  90% { opacity: 1; }
  100% { opacity: 0; }
}
</style> 