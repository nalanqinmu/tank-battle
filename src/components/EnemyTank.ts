import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { Bullet } from './Bullet';

export class EnemyTank {
  mesh: THREE.Group;
  body: CANNON.Body;
  turret: THREE.Mesh;
  isActive: boolean = true;
  shootCooldown: number = 0;
  targetPosition: THREE.Vector3 | null = null;
  moveTime: number = 0;
  
  constructor(scene: THREE.Scene, world: CANNON.World, position: THREE.Vector3) {
    // 创建敌方坦克网格
    this.mesh = new THREE.Group();
    
    // 坦克身体
    const bodyGeometry = new THREE.BoxGeometry(2, 1, 3);
    const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0xad2d2d });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 0.5;
    body.castShadow = true;
    this.mesh.add(body);
    
    // 坦克炮塔
    const turretGeometry = new THREE.CylinderGeometry(0.75, 0.75, 0.5, 16);
    const turretMaterial = new THREE.MeshStandardMaterial({ color: 0x8d2424 });
    this.turret = new THREE.Mesh(turretGeometry, turretMaterial);
    this.turret.position.y = 1.25;
    this.turret.castShadow = true;
    this.mesh.add(this.turret);
    
    // 坦克炮管
    const barrelGeometry = new THREE.CylinderGeometry(0.2, 0.2, 2, 16);
    const barrelMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 });
    const barrel = new THREE.Mesh(barrelGeometry, barrelMaterial);
    barrel.position.z = 1;
    barrel.position.y = 0;
    barrel.rotation.x = Math.PI / 2;
    barrel.castShadow = true;
    this.turret.add(barrel);
    
    // 设置位置
    this.mesh.position.copy(position);
    scene.add(this.mesh);
    
    // 创建物理体
    const shape = new CANNON.Box(new CANNON.Vec3(1, 0.5, 1.5));
    this.body = new CANNON.Body({
      mass: 5,
      shape: shape
    });
    this.body.position.set(position.x, position.y, position.z);
    world.addBody(this.body);
  }
  
  update(deltaTime: number, playerPosition: THREE.Vector3, scene: THREE.Scene, world: CANNON.World): Bullet | null {
    if (!this.isActive) return null;
    
    // 更新射击冷却
    if (this.shootCooldown > 0) {
      this.shootCooldown -= deltaTime;
    }
    
    // 更新移动时间
    this.moveTime -= deltaTime;
    if (this.moveTime <= 0 || !this.targetPosition) {
      // 随机新目标位置或朝向玩家
      if (Math.random() > 0.7) {
        // 随机位置
        this.targetPosition = new THREE.Vector3(
          Math.random() * 40 - 20,
          0,
          Math.random() * 40 - 20
        );
      } else {
        // 朝向玩家但保持一定距离
        const dirToPlayer = new THREE.Vector3().subVectors(playerPosition, this.mesh.position).normalize();
        this.targetPosition = new THREE.Vector3().copy(playerPosition).sub(
          dirToPlayer.multiplyScalar(10 + Math.random() * 5)
        );
      }
      this.moveTime = 3 + Math.random() * 2; // 3-5秒更换目标
    }
    
    // 向目标移动
    if (this.targetPosition) {
      const direction = new THREE.Vector3().subVectors(this.targetPosition, this.mesh.position).normalize();
      
      // 计算旋转方向
      const tankDirection = new THREE.Vector3(0, 0, -1).applyQuaternion(this.mesh.quaternion);
      const rotationAngle = Math.atan2(direction.x, -direction.z) - Math.atan2(tankDirection.x, tankDirection.z);
      
      // 应用旋转
      this.body.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), Math.atan2(direction.x, -direction.z));
      
      // 应用移动力
      const force = new CANNON.Vec3(0, 0, -30);
      this.body.applyLocalForce(force, new CANNON.Vec3(0, 0, 0));
    }
    
    // 炮塔瞄准玩家
    const turretDirection = new THREE.Vector3().subVectors(playerPosition, this.turret.getWorldPosition(new THREE.Vector3())).normalize();
    this.turret.lookAt(playerPosition);
    
    // 检查是否可以射击（距离和冷却时间）
    const distanceToPlayer = this.mesh.position.distanceTo(playerPosition);
    if (distanceToPlayer < 20 && this.shootCooldown <= 0 && Math.random() > 0.7) {
      this.shootCooldown = 2 + Math.random() * 2; // 2-4秒冷却
      
      // 射击
      return this.shoot(scene, world);
    }
    
    // 同步位置和旋转
    this.mesh.position.copy(this.body.position as any);
    this.mesh.quaternion.copy(this.body.quaternion as any);
    
    return null;
  }
  
  shoot(scene: THREE.Scene, world: CANNON.World): Bullet | null {
    // 获取炮管前端位置作为子弹起点
    const bulletPosition = new THREE.Vector3(0, 0, 2);
    bulletPosition.applyQuaternion(this.turret.quaternion);
    bulletPosition.add(this.turret.getWorldPosition(new THREE.Vector3()));
    
    // 获取炮管方向作为子弹方向
    const bulletDirection = new THREE.Vector3(0, 0, 1);
    bulletDirection.applyQuaternion(this.turret.quaternion);
    
    // 创建子弹
    return new Bullet(scene, world, bulletPosition, bulletDirection);
  }
  
  destroy(scene: THREE.Scene, world: CANNON.World): void {
    if (this.isActive) {
      scene.remove(this.mesh);
      world.removeBody(this.body);
      this.isActive = false;
    }
  }
} 