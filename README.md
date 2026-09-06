# Agile-Templates（项目模板注册中心）

[![Check](https://github.com/pig0224/agile-templates/actions/workflows/check.yml/badge.svg)](https://github.com/pig0224/agile-templates/actions/workflows/check.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

📖 **完整文档**：https://pig0224.github.io/agile-docs/ （模板使用 / 开发指南 / 发布）

[Agile CLI](https://github.com/pig0224/agile-cli) 的**项目模板源**：`registry.json` 声明全部模板。**新增模板无需升级 CLI** —— 新建目录 + 登记 registry.json 即可。以 git 仓库分发，推送即发版，无需 npm、无需构建。

## 用户视角

```bash
npm i -g fcc-agile-cli
agile template list                 # 列出全部模板（拉取/更新缓存）
agile init project order-service --template go-service
agile template update               # 强制刷新模板缓存
```

## 目录结构

```
├── registry.json               # 注册中心 v2：singles / solutions 全数组（条目 = name + description + language?/framework?）
├── registry.schema.json        # JSON Schema（字段中文说明，编辑器补全校验）
├── singles/                    # 单例模板（一个模板一个完整项目骨架，目录名 = 模板名）
│   ├── vue3-vite/
│   ├── react-vite/
│   ├── go-service/
│   ├── java-springboot/
│   └── node-lib/
└── solutions/                  # 组合模板：一组合一目录，成员 = 组合专属完整模板骨架
    └── <组合名>/<成员名>/
```

## 新增一个单例模板

1. 新建目录 `singles/<模板名>/`，放入项目骨架文件
2. 在 `registry.json` 的 `singles` 数组登记 `{ "name": "<模板名>", "description": "一句话职责", "language": [...], "framework": [...] }`（language/framework 可省略；无 path 字段，目录由名字派生）
3. `node scripts/check.mjs` 本地校验通过后提交推送，即完成发版

## 新增一个组合模板

1. 为每个成员新建 `solutions/<组合名>/<成员名>/`（组合专属完整模板骨架，可复制单例模板作起点定制）
2. 在 `registry.json` 的 `solutions` 数组登记组合（`description` + `projects` 成员数组，条目与 singles 同形状；数组顺序 = 生成顺序）
3. `node scripts/check.mjs` 本地校验通过后提交推送

## 模板约定

**命名（防冲突设计）**：
- 格式 `^[a-z][a-z0-9-]*$`
- **模板名 / 组合名 / 成员名三段全局唯一**（init 后全部平铺落盘 `projects/`，同一命名空间）
- 命名模式：模板 `<技术栈/框架>-<变体>`（`vue3-vite`、`go-service`…）；组合 `<系统域>-<定位>`（`admin-base`…）
- **目录名必须与 registry.json 中的 name 完全一致**（无 path 字段，目录由名字派生；CLI 与 check 脚本双重强制校验，不一致直接拒绝）
- 未来支持多模板源时，限定名为 `<source>:<name>` 消除跨源同名

**变量替换**：脚手架生成时对文本文件做占位符替换（含目录名）：
- `{{name}}` → **实际落地目录名**（单例 = 项目名；组合成员 = 平铺后的成员目录名，CLI 校验 `^[a-z][a-z0-9-]*$`——占位符只应出现在该格式合法的位置）
- `{{safeName}}` → 小写字母数字安全段（Java 包名等场景）

**缓存**：CLI 将本仓库克隆到 `~/.agile/templates/<url-hash>`（用户级，跨 workspace 共享），默认读缓存，`agile template update` 时联网刷新，失联降级使用本地缓存。workspace 外执行 `agile template list` / `agile template update` 自动使用内置官方模板源。

详细设计：[docs/registry.md](./docs/registry.md)；开发约定见 [CLAUDE.md](./CLAUDE.md)。

## License

[MIT](./LICENSE) © FCC contributors
