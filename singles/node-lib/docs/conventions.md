# {{name}} 项目约定（目录 / 命名 / 测试）

> 模板 node-lib 预填的默认值，项目演进时直接在本文件修订与追加。

## 目录结构

模板初始骨架（最小可运行）：

```
src/
└── index.ts    # 唯一公共出口（public API）
```

增长时的建议布局（按需创建，不预建空目录）：

```
src/
├── index.ts       # 出口文件：re-export 各模块的公共 API
├── <模块>/        # 按功能拆子模块，各带 index.ts 收口
└── <模块>/xxx.test.ts  # 测试与被测文件同目录同名
```

## 命名约定

- 文件 camelCase（`parseArgs.ts`）；类型 / 接口 / 类 PascalCase；其余 camelCase
- 不导出的标识符不写 JSDoc 导出注记；公共 API 必须有 JSDoc（发布后即文档）

## 测试约定

- node:test 内置运行器（`node --test dist/**/*.test.js`）——**先 `npm run build` 再 `npm test`**
- 测试与被测文件同目录同名 `*.test.ts`，随源码一起编译到 dist/
- 每个导出函数至少覆盖正常 + 边界路径（先写失败测试）；本模板无 e2e 层（库不需要）

## 团队 / 项目补充约定

（随项目演进在此追加；与上层规范冲突时按 CLAUDE.md 的优先级处理）
