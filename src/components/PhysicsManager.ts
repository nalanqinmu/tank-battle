import * as CANNON from 'cannon-es';

export function usePhysicsManager() {
  const world = new CANNON.World({ 
    gravity: new CANNON.Vec3(0, -9.82, 0) // Standard gravity
  });
  
  // 配置物理引擎属性，提高稳定性
  world.defaultContactMaterial.friction = 0.3;
  world.defaultContactMaterial.restitution = 0.1;  // 减少弹性
  world.defaultContactMaterial.contactEquationStiffness = 1e6;
  world.defaultContactMaterial.contactEquationRelaxation = 3;

  let groundBody: CANNON.Body;

  const initPhysics = () => {
    // Create ground plane
    const groundShape = new CANNON.Plane();
    groundBody = new CANNON.Body({ mass: 0 }); // mass 0 makes it static
    groundBody.addShape(groundShape);
    groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0); // Rotate to be horizontal
    
    // 创建自定义材质，减少坦克与地面的摩擦
    const groundMaterial = new CANNON.Material('ground');
    const tankMaterial = new CANNON.Material('tank');
    groundBody.material = groundMaterial;
    
    // 创建地面和坦克之间的接触材质
    const groundTankContactMaterial = new CANNON.ContactMaterial(
      groundMaterial,
      tankMaterial,
      {
        friction: 0.2,        // 减少摩擦
        restitution: 0.0,     // 无弹性
        contactEquationRelaxation: 3,
        contactEquationStiffness: 1e6
      }
    );
    world.addContactMaterial(groundTankContactMaterial);
    
    world.addBody(groundBody);
    console.log('Physics world and ground initialized.');
  };

  const update = (deltaTime: number) => {
    // 使用更小的步长和更多的子步骤，提高稳定性
    const subSteps = 3;  // 增加子步骤数量
    const timeStep = 1/120;  // 减小步长
    world.step(timeStep, deltaTime, subSteps);
  };

  const cleanup = () => {
     // Remove all bodies from the world
     while (world.bodies.length > 0) {
       world.removeBody(world.bodies[0]);
     }
     // Potential additional cleanup for constraints, materials, etc.
     console.log('Physics world cleaned up.');
  };

  return {
    world,
    initPhysics,
    update,
    cleanup,
    groundBody: () => groundBody // Expose ground body via a function
  };
} 