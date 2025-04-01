import * as THREE from 'three';
import * as CANNON from 'cannon-es';

export class Bullet {
  mesh: THREE.Mesh;
  body: CANNON.Body;
  timeToLive: number;
  isActive: boolean;
  direction: THREE.Vector3;
  speed: number;
  lifetime: number;

  constructor(scene: THREE.Scene, world: CANNON.World, position: THREE.Vector3, direction: THREE.Vector3) {
    // 创建子弹网格
    const geometry = new THREE.SphereGeometry(0.2, 8, 8);
    const material = new THREE.MeshStandardMaterial({ color: 0xff0000 });
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.castShadow = true;
    this.mesh.position.copy(position);
    scene.add(this.mesh);

    // 创建子弹物理体
    const shape = new CANNON.Sphere(0.2);
    this.body = new CANNON.Body({
      mass: 1,
      shape: shape,
      velocity: new CANNON.Vec3(direction.x * 50, direction.y * 50, direction.z * 50)
    });
    this.body.position.set(position.x, position.y, position.z);
    world.addBody(this.body);

    // 设置生命周期和状态
    this.timeToLive = 2; // 2秒后消失
    this.isActive = true;
    
    // 添加新属性
    this.direction = direction.clone();
    this.speed = 0.5;
    this.lifetime = 5;
  }

  update(deltaTime: number): void {
    if (!this.isActive) return;

    // 更新生命周期
    this.timeToLive -= deltaTime;
    this.lifetime -= deltaTime;
    if (this.timeToLive <= 0 || this.lifetime <= 0) {
      this.isActive = false;
      return;
    }

    // 同步位置
    this.mesh.position.copy(this.body.position as any);
  }

  // 销毁子弹
  destroy(scene: THREE.Scene, world: CANNON.World): void {
    scene.remove(this.mesh);
    world.removeBody(this.body);
    this.isActive = false;
  }
} 