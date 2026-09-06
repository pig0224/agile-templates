# {{name}} 项目约定（目录 / 命名 / 测试）

> 模板 vue3-vite 预填的默认值，项目演进时直接在本文件修订与追加。

## 目录结构

模板初始骨架（最小可运行）：

```
src/
├── main.ts        # 应用入口
├── App.vue        # 根组件
└── env.d.ts       # 环境类型声明
e2e/
└── smoke.spec.ts  # 关键路径冒烟
```

增长时的建议布局（按需创建，不预建空目录）：

```
src/
├── components/    # 可复用组件
├── views/         # 页面级组件（与路由对应）
├── composables/   # 组合式函数
├── stores/        # 状态管理（如引入 pinia）
└── api/           # 接口层（契约对齐任务 design.md）
```

## 命名约定

- 组件文件与注册名 PascalCase（如 `UserCard.vue`）；composable 文件 `useXxx.ts`
- 单测与被测文件同目录同名 `*.spec.ts`；e2e 固化脚本在 `e2e/*.spec.ts`
- 常量 UPPER_SNAKE_CASE；类型 / 接口 PascalCase；其余 camelCase

## 测试约定

- 单测 vitest：每个组件 / 组合式函数至少覆盖正常 + 边界路径（先写失败测试）
- e2e Playwright：只覆盖关键路径（对应 gen-test.md 前端用例的 e2e 类型），运行产物不入库

## 团队 / 项目补充约定

（随项目演进在此追加；与上层规范冲突时按 CLAUDE.md 的优先级处理）
