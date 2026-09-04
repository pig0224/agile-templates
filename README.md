# Agile-Templates（项目模板注册中心）

[![Check](https://github.com/pig0224/agile-templates/actions/workflows/check.yml/badge.svg)](https://github.com/pig0224/agile-templates/actions/workflows/check.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

📖 **完整文档**：https://pig0224.github.io/agile-docs/ （模板使用 / 开发指南 / 发布）

[Agile CLI](https://github.com/pig0224/agile-cli) 的**项目模板源**：`registry.yaml` 声明全部模板。**新增模板无需升级 CLI** —— 新建目录 + 登记 registry.yaml 即可。以 git 仓库分发，推送即发版，无需 npm、无需构建。

## 用户视角

```bash
npm i -g fcc-agile-cli
agile template list                 # 列出全部模板（拉取/更新缓存）
agile init project order-service --template go-service
agile template update               # 强制刷新模板缓存
```

## 目录结构

```
├── registry.yaml          # 注册中心：name → { description, language, framework, path }
├── vue3-vite/             # 每个模板一个目录（目录名 = 模板名）
├── react-vite/
├── go-service/
├── java-springboot/
└── node-lib/
```

## 新增一个模板

1. 新建目录 `<模板名>/`，放入项目骨架文件
2. 在 `registry.yaml` 的 `templates:` 下登记（`path` 缺省为 `./<模板名>`）
3. `node scripts/check.mjs` 本地校验通过后提交推送，即完成发版

## 模板约定

**命名（防冲突设计）**：
- 格式 `^[a-z][a-z0-9-]*$`，全局唯一
- 命名模式 `<技术栈/框架>-<变体>`：`vue3-vite`、`go-service`、`java-springboot`、`node-lib`
- **目录名必须与 registry.yaml 中的 name 完全一致**（CLI 与 check 脚本双重强制校验，不一致直接拒绝）
- 未来支持多模板源时，限定名为 `<source>:<name>` 消除跨源同名

**变量替换**：脚手架生成时对文本文件做占位符替换（含目录名）：
- `{{name}}` → 项目名（用户输入）
- `{{safeName}}` → 小写字母数字安全段（Java 包名等场景）

**缓存**：CLI 将本仓库克隆到 `~/.agile/templates/<url-hash>`（用户级，跨 workspace 共享），默认读缓存，`agile template update` / `--refresh` 时联网刷新，失联降级使用本地缓存。

详细设计：[docs/registry.md](./docs/registry.md)；开发约定见 [CLAUDE.md](./CLAUDE.md)。

## License

[MIT](./LICENSE) © FCC contributors
