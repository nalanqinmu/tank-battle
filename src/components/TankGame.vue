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
      <span :class="{ 'key-active': keys.space }">空格</span>: 射击
    </p>
    <p>
      <span :class="{ 'key-active': keys.g }">G</span>: 切换网格显示
    </p>
    <p>
      <span :class="{ 'key-active': keys.v }">V</span>: 切换视角
    </p>
    <p>
      <span :class="{ 'key-active': keys.h }">H</span>: 查看帮助
    </p>
    <p class="tip">利用掩体躲避敌人攻击</p>
    <p class="tip">鼠标可拖动调整视角</p>
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
    <p class="tip">使用WASD移动，空格键射击</p>
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
          <li><strong>射击：</strong> 空格键</li>
          <li><strong>视角切换：</strong> V键 - 在第三人称跟随视角和自由视角之间切换</li>
          <li><strong>网格显示：</strong> G键 - 切换地面网格显示</li>
        </ul>
      </div>
      
      <div class="help-section">
        <h3>游戏技巧</h3>
        <ul>
          <li>利用掩体躲避敌人攻击，避免被多个敌人同时瞄准</li>
          <li>当血量低时，寻找掩护并保持距离</li>
          <li>射击敌人可以获得分数，摧毁敌人坦克获得更多分数</li>
          <li>第三人称视角有更好的沉浸感，自由视角便于观察战场</li>
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
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import * as CANNON from 'cannon-es';
import { Bullet } from './Bullet';
import { EnemyTank } from './EnemyTank';

// 游戏状态
const score = ref(0);
const health = ref(100);
const gameOver = ref(false);
const webGLSupported = ref(true);
const showGrid = ref(false); // 控制是否显示网格，默认不显示
const thirdPersonView = ref(true); // 控制是否使用第三人称视角
const showHelp = ref(true); // 默认显示帮助面板
const gameStarted = ref(false); // 控制游戏是否开始

// 场景容器引用
const sceneContainer = ref<HTMLDivElement>();

// 三维场景相关变量
let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.WebGLRenderer;
let controls: OrbitControls;

// 物理世界
let world: CANNON.World;

// 游戏对象
let tank: THREE.Object3D | null = null;
let tankBody: CANNON.Body | null = null;
let turret: THREE.Object3D | null = null;
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
  v: false, // 添加V键用于切换视角
  space: false,
  h: false // 添加H键用于显示帮助面板
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
  createObstacles(15); // 创建15个掩体
  
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
  scene.background = new THREE.Color(0x87CEEB); // 更准确的天空蓝色
  
  try {
    // 创建相机 - 使用更低的视角增强沉浸感
    const aspect = window.innerWidth / window.innerHeight;
    camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 1000);
    camera.position.set(0, 10, 15); // 降低高度，减小距离
    camera.lookAt(0, 0, 0);
    
    // 创建渲染器 - 使用基本设置
    renderer = new THREE.WebGLRenderer({ 
      antialias: true,
      canvas: document.createElement('canvas')
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x87CEEB, 1);
    
    // 添加到DOM
    sceneContainer.value.innerHTML = '';
    sceneContainer.value.appendChild(renderer.domElement);
    
    // 使用简单控制，不启用damping (可能导致问题)
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = false;
    controls.maxPolarAngle = Math.PI / 2 - 0.1; // 限制视角不要看到地面以下
    
    // 禁用部分控制以避免与相机跟随冲突
    controls.enableZoom = true; // 允许缩放
    controls.enablePan = false; // 禁止平移
    controls.enableRotate = false; // 禁止旋转
    controls.minDistance = 5; // 最小距离
    controls.maxDistance = 30; // 最大距离
    
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
    
    // 窗口大小调整
    window.addEventListener('resize', onWindowResize);
    
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
  
  // 如果是G键而且之前未按下，则切换网格显示
  if (key === 'g' && !keys.g) {
    keys.g = true;
    showGrid.value = !showGrid.value;
    updateGridHelperVisibility();
    return;
  }
  
  // 如果是V键而且之前未按下，则切换视角模式
  if (key === 'v' && !keys.v) {
    keys.v = true;
    thirdPersonView.value = !thirdPersonView.value;
    console.log(`视角模式切换为: ${thirdPersonView.value ? '第三人称' : '自由视角'}`);
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
    case ' ': 
      keys.space = true; 
      fireSimpleBullet(); 
      break;
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
    case 'v': keys.v = false; break;
    case 'h': keys.h = false; break;
    case ' ': keys.space = false; break;
  }
};

// 简化版发射子弹
const fireSimpleBullet = () => {
  if (!tank || !tankBody) return;
  
  // 创建一个简单的球体表示子弹
  const bulletGeometry = new THREE.SphereGeometry(0.2, 8, 8);
  const bulletMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
  const bulletMesh = new THREE.Mesh(bulletGeometry, bulletMaterial);
  
  // 设置子弹位置在坦克前方
  // 修复方向问题，将Z轴正向作为坦克前进方向
  const tankDirection = new THREE.Vector3(0, 0, 1).applyQuaternion(tank.quaternion);
  const bulletPosition = new THREE.Vector3().copy(tank.position).add(
    tankDirection.multiplyScalar(2)
  );
  bulletPosition.y = 1; // 稍微抬高一点
  bulletMesh.position.copy(bulletPosition);
  
  scene.add(bulletMesh);
  
  // 记录子弹信息
  bullets.push({
    mesh: bulletMesh,
    direction: tankDirection,
    speed: 0.5,
    lifetime: 5,
    isActive: true
  });
  
  // 创建射击特效
  createMuzzleFlash(bulletPosition.clone(), tankDirection);
  
  // 播放射击声音
  playSound(shootSound);
};

// 简化版坦克移动，直接操作3D对象而不是通过物理引擎
const updateSimpleTankMovement = () => {
  if (!tank) return;
  
  const moveSpeed = 0.15;
  const rotateSpeed = 0.03;
  
  // 坦克当前位置
  const currentPosition = tank.position.clone();
  let newPosition = currentPosition.clone();
  
  // 计算移动后的新位置
  if (keys.w) {
    // 修复方向问题，将Z轴正向作为坦克前进方向
    const direction = new THREE.Vector3(0, 0, 1).applyQuaternion(tank.quaternion);
    newPosition.add(direction.multiplyScalar(moveSpeed));
  }
  
  if (keys.s) {
    // 修复方向问题，将Z轴负向作为坦克后退方向
    const direction = new THREE.Vector3(0, 0, -1).applyQuaternion(tank.quaternion);
    newPosition.add(direction.multiplyScalar(moveSpeed));
  }
  
  // 检查新位置是否与障碍物碰撞
  let collisionDetected = false;
  for (const obstacle of obstacles) {
    // 计算坦克与障碍物之间的距离
    const distance = newPosition.distanceTo(obstacle.mesh.position);
    
    // 如果距离小于坦克和障碍物的半径之和，则认为发生碰撞
    // 坦克尺寸约1.5x2.5，障碍物尺寸3x3，使用3.0作为安全距离
    if (distance < 3.0) {
      collisionDetected = true;
      break;
    }
  }
  
  // 只有在没有碰撞的情况下才更新位置
  if (!collisionDetected) {
    tank.position.copy(newPosition);
  } else {
    // 如果发生碰撞，可以播放碰撞音效或显示视觉反馈
    console.log("坦克与障碍物碰撞");
  }
  
  // 旋转不受碰撞影响
  if (keys.a) {
    tank.rotation.y += rotateSpeed;
  }
  
  if (keys.d) {
    tank.rotation.y -= rotateSpeed;
  }
  
  // 同步物理体位置（如果需要）
  if (tankBody) {
    tankBody.position.copy(tank.position);
    tankBody.quaternion.copy(tank.quaternion);
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
    
    // 更新轨道控制器
    controls.update();
    
    // 渲染场景
    renderer.render(scene, camera);
  } catch (e) {
    console.error('渲染错误:', e);
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
  createObstacles(15);
  
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
  const instancedMesh = new THREE.InstancedMesh(enemyGeometry, defaultMaterial, 10);
  instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  instancedMesh.count = 0;
  scene.add(instancedMesh);
  
  console.log('敌方坦克实例化网格已创建');
  
  // 尝试加载敌人纹理并更新材质
  const textureLoader = new THREE.TextureLoader();
  textureLoader.load('/textures/enemy_tank.png', (texture) => {
    console.log('敌方坦克纹理加载成功:', texture.uuid);
    texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
    
    // 创建敌方坦克专用纹理材质，不添加额外颜色干扰
    const texturedMaterial = new THREE.MeshStandardMaterial({
      map: texture,
      metalness: 0.7,
      roughness: 0.3
      // 移除 color 设置，让纹理本身的颜色显示
    });
    
    // 更新实例化网格的材质
    instancedMesh.material = texturedMaterial;
    console.log('敌方坦克材质已更新为纹理材质，不使用额外颜色');
  }, undefined, (err) => {
    console.warn('敌方坦克纹理加载失败，保持默认材质:', err);
  });
  
  // 直接返回已创建的实例化网格
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
  enemyBody.userData = { isEnemy: true };
  
  // 记录敌人信息
  enemies.push({
    mesh: enemyMesh,
    body: enemyBody,
    health: 100,
    lastShootTime: 0
  });
  
  console.log('生成敌人，当前敌人数量:', enemies.length);
};

// 更新敌人AI
const updateEnemies = (deltaTime) => {
  // 更新敌人生成计时器
  enemySpawnTimer -= deltaTime;
  if (enemySpawnTimer <= 0) {
    spawnEnemy();
    enemySpawnTimer = 3 + Math.random() * 2; // 3-5秒生成一个敌人
  }
  
  // 更新每个敌人
  enemies.forEach((enemy, index) => {
    if (!tank) return;
    
    // 获取到坦克的方向
    const direction = new THREE.Vector3();
    direction.subVectors(tank.position, enemy.mesh.position).normalize();
    
    // 让敌人朝向坦克
    if (!enemy.mesh.isInstancedMesh) {
      // 普通网格直接处理
      enemy.mesh.lookAt(tank.position);
    } else {
      // 实例化网格需要更新矩阵
      const targetAngle = Math.atan2(
        tank.position.x - enemy.mesh.position.x,
        tank.position.z - enemy.mesh.position.z
      );
      
      // 更新虚拟网格的朝向
      enemy.mesh.rotation.y = targetAngle;
      
      // 更新实例化网格的矩阵
      if (enemyInstancedMesh) {
        try {
          const matrix = new THREE.Matrix4();
          // 先处理位置
          matrix.makeTranslation(
            enemy.mesh.position.x,
            enemy.mesh.position.y,
            enemy.mesh.position.z
          );
          
          // 再处理旋转
          const rotationMatrix = new THREE.Matrix4();
          rotationMatrix.makeRotationY(enemy.mesh.rotation.y);
          matrix.multiply(rotationMatrix);
          
          // 设置矩阵
          enemyInstancedMesh.setMatrixAt(enemy.mesh.instanceId, matrix);
          // 标记需要更新
          enemyInstancedMesh.instanceMatrix.needsUpdate = true;
        } catch (error) {
          console.error('更新敌人矩阵出错:', error, enemy);
        }
      }
    }
    
    // 简单AI: 如果玩家在一定距离内，敌人会接近
    const distanceToPlayer = enemy.mesh.position.distanceTo(tank.position);
    
    if (distanceToPlayer < 25) {
      // 计算前进方向
      const moveDirection = direction.clone();
      
      // 简单的避障算法
      // 检查附近是否有障碍物
      let obstacleAvoidance = new THREE.Vector3();
      for (const obstacle of obstacles) {
        const distanceToObstacle = enemy.mesh.position.distanceTo(obstacle.mesh.position);
        
        // 如果障碍物在附近，尝试绕过它
        if (distanceToObstacle < 5) {
          // 计算避障向量 (远离障碍物)
          const avoidDir = new THREE.Vector3()
            .subVectors(enemy.mesh.position, obstacle.mesh.position)
            .normalize()
            .multiplyScalar(5 - distanceToObstacle); // 距离越近，避障力越大
          
          obstacleAvoidance.add(avoidDir);
        }
      }
      
      // 如果有障碍物需要避开，调整方向
      if (obstacleAvoidance.length() > 0) {
        // 混合原始方向和避障方向
        moveDirection.add(obstacleAvoidance.multiplyScalar(0.5));
        moveDirection.normalize();
      }
      
      // 接近玩家
      const moveSpeed = 0.05;
      const newPosition = enemy.mesh.position.clone().add(
        moveDirection.multiplyScalar(moveSpeed)
      );
      
      // 确保新位置不会与其他障碍物重叠
      let validPosition = true;
      for (const obstacle of obstacles) {
        if (newPosition.distanceTo(obstacle.mesh.position) < 3) {
          validPosition = false;
          break;
        }
      }
      
      // 只有在新位置有效时才移动
      if (validPosition) {
        enemy.mesh.position.copy(newPosition);
        enemy.body.position.copy(newPosition);
        
        // 如果是实例化网格，确保更新位置
        if (enemy.mesh.isInstancedMesh && enemyInstancedMesh) {
          try {
            const matrix = new THREE.Matrix4();
            // 先处理位置
            matrix.makeTranslation(
              enemy.mesh.position.x,
              enemy.mesh.position.y,
              enemy.mesh.position.z
            );
            
            // 再处理旋转
            const rotationMatrix = new THREE.Matrix4();
            rotationMatrix.makeRotationY(enemy.mesh.rotation.y);
            matrix.multiply(rotationMatrix);
            
            // 设置矩阵
            enemyInstancedMesh.setMatrixAt(enemy.mesh.instanceId, matrix);
            // 标记需要更新
            enemyInstancedMesh.instanceMatrix.needsUpdate = true;
          } catch (error) {
            console.error('更新敌人位置出错:', error, enemy);
          }
        }
      }
      
      // 射击玩家
      enemy.lastShootTime -= deltaTime;
      if (enemy.lastShootTime <= 0 && distanceToPlayer < 15) {
        fireEnemyBullet(enemy);
        enemy.lastShootTime = 2 + Math.random() * 2; // 2-4秒射击一次
      }
    }
    
    // 检查敌人健康状态
    if (enemy.health <= 0) {
      // 敌人被消灭
      createExplosion(enemy.mesh.position.clone());
      
      // 播放爆炸声音
      playSound(explosionSound);
      
      // 清理敌人
      if (!enemy.mesh.isInstancedMesh) {
        scene.remove(enemy.mesh);
      } else if (enemyInstancedMesh) {
        // 对于实例化网格，我们将其移到场景外隐藏
        try {
          const matrix = new THREE.Matrix4();
          matrix.makeTranslation(0, -1000, 0); // 移到场景外
          enemyInstancedMesh.setMatrixAt(enemy.mesh.instanceId, matrix);
          enemyInstancedMesh.instanceMatrix.needsUpdate = true;
          console.log('隐藏敌人实例:', enemy.mesh.instanceId);
        } catch (error) {
          console.error('隐藏敌人出错:', error, enemy);
        }
      }
      
      world.removeBody(enemy.body);
      enemies.splice(index, 1);
      
      // 增加分数
      score.value += 100;
      
      // 显示分数动画
      showScoreAnimation(enemy.mesh.position.clone(), 100);
    }
  });
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
  
  // 创建子弹
  const bulletGeometry = new THREE.SphereGeometry(0.2, 8, 8);
  const bulletMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
  const bulletMesh = new THREE.Mesh(bulletGeometry, bulletMaterial);
  
  // 子弹发射方向（朝向玩家）
  const direction = new THREE.Vector3();
  direction.subVectors(tank.position, enemy.mesh.position).normalize();
  
  // 子弹发射位置
  const bulletPosition = enemy.mesh.position.clone().add(
    direction.clone().multiplyScalar(2)
  );
  bulletPosition.y = 1;
  bulletMesh.position.copy(bulletPosition);
  
  scene.add(bulletMesh);
  
  // 记录子弹信息
  enemyBullets.push({
    mesh: bulletMesh,
    direction: direction,
    speed: 0.3,
    lifetime: 5,
    isActive: true
  });
  
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
        enemy.health -= 50;
        
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
        enemy.body.position.copy(enemy.mesh.position);
      }
    }
  }
};

// 更新所有子弹
const updateBullets = (deltaTime) => {
  // 更新玩家子弹
  for (let i = bullets.length - 1; i >= 0; i--) {
    const bullet = bullets[i];
    
    // 移动子弹
    bullet.mesh.position.add(bullet.direction.clone().multiplyScalar(bullet.speed));
    
    // 更新生命周期
    bullet.lifetime -= deltaTime;
    
    // 检查子弹是否应该销毁
    if (bullet.lifetime <= 0) {
      scene.remove(bullet.mesh);
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
        scene.remove(bullet.mesh);
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
        enemy.health -= 50;
        
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
  
  // 更新敌人子弹
  for (let i = enemyBullets.length - 1; i >= 0; i--) {
    const bullet = enemyBullets[i];
    
    // 移动子弹
    bullet.mesh.position.add(bullet.direction.clone().multiplyScalar(bullet.speed));
    
    // 更新生命周期
    bullet.lifetime -= deltaTime;
    
    // 检查子弹是否应该销毁
    if (bullet.lifetime <= 0) {
      scene.remove(bullet.mesh);
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
        scene.remove(bullet.mesh);
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
        scene.remove(bullet.mesh);
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
  const velocities = [];
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
  const smokeVelocities = [];
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
      positions[i * 3] += velocities[i].x;
      positions[i * 3 + 1] += velocities[i].y;
      positions[i * 3 + 2] += velocities[i].z;
      
      // 粒子逐渐减速
      velocities[i].y -= 0.01; // 重力效果
    }
    particleSystem.geometry.attributes.position.needsUpdate = true;
    
    // 烟雾运动 - 缓慢上升
    const smokePositions = smokeSystem.geometry.attributes.position.array;
    for (let i = 0; i < smokeCount; i++) {
      smokePositions[i * 3] += smokeVelocities[i].x;
      smokePositions[i * 3 + 1] += smokeVelocities[i].y;
      smokePositions[i * 3 + 2] += smokeVelocities[i].z;
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

// 更新相机跟随坦克
const updateCamera = () => {
  if (!tank) return;
  
  if (thirdPersonView.value) {
    // 第三人称视角 - 跟随坦克
    
    // 相机与坦克的相对位置（在坦克后方偏上）
    const offset = new THREE.Vector3(0, 8, 12);
    
    // 计算坦克的前进方向 - 修正为Z轴正方向
    const tankDirection = new THREE.Vector3(0, 0, 1).applyQuaternion(tank.quaternion);
    
    // 计算相机的目标位置（在坦克后方）
    const targetPosition = tank.position.clone().sub(tankDirection.clone().multiplyScalar(offset.z));
    targetPosition.y = offset.y; // 设置相机高度
    
    // 平滑移动相机
    camera.position.lerp(targetPosition, 0.05);
    
    // 相机看向坦克前方
    const lookAtPosition = tank.position.clone().add(tankDirection.clone().multiplyScalar(10));
    camera.lookAt(lookAtPosition);
    
    // 禁用轨道控制器
    controls.enabled = false;
  } else {
    // 自由视角模式
    controls.enabled = true;
    
    // 自动将相机旋转中心设为坦克位置
    controls.target.copy(tank.position);
  }
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
</style> 