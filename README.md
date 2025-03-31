# Three.js 3D坦克大战 (Vue3 + Vite)

一个基于Vue3、Vite和Three.js开发的3D坦克大战游戏。

## 功能特点

- 3D场景渲染与光照效果
- 物理引擎实现的碰撞检测
- 坦克WASD控制移动
- 空格键发射子弹
- 障碍物互动

## 技术栈

- Vue 3 (组合式API)
- TypeScript
- Three.js (3D渲染)
- Cannon-es (物理引擎)

## 安装与运行

```bash
# 安装依赖
npm install

# 开发环境运行
npm run dev

# 生产环境构建
npm run build
```

## 游戏控制

- `W/A/S/D` - 控制坦克移动
- `空格键` - 发射子弹
- 鼠标拖拽 - 调整视角

## 项目结构

```
/src
  /components
    - TankGame.vue     # 主游戏组件
    - Bullet.ts        # 子弹类
  /assets              # 静态资源
  - App.vue            # 应用入口
  - main.ts            # 主程序
```

## 扩展功能（计划中）

- 敌方AI坦克
- 得分系统
- 多人联机对战
- 更多游戏场景
- 更高级的物理互动

## 许可证

MIT
