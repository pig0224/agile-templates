# agile-templates 仓库（项目模板注册中心）

本仓库是 **agile CLI 的项目模板源**：`registry.yaml` 声明全部模板。**新增模板无需改动 agile CLI** —— 新建目录 + 登记 registry.yaml 即可，用户侧 `agile init project <name> --template <模板名>` 直接可用。

> 本仓库整体可独立拆分为单独的 git 仓库（与 CLI 仓库解耦）。CLI 从 workspace.yaml 的 `templates.registry` 读取本仓库地址。

## 用户视角

```bash
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
3. 提交推送后即可使用

## 模板约定

**命名（防冲突设计）**：
- 格式 `^[a-z][a-z0-9-]*$`，全局唯一
- 命名模式 `<技术栈/框架>-<变体>`：`vue3-vite`、`go-service`、`java-springboot`、`node-lib`
- **目录名必须与 registry.yaml 中的 name 完全一致**（CLI 运行时校验，不一致报错）
- 未来支持多模板源时，限定名为 `<source>:<name>` 消除跨源同名

**变量替换**：脚手架生成时对文本文件做占位符替换（含目录名）：
- `{{name}}` → 项目名（用户输入）
- `{{safeName}}` → 小写字母数字安全段（Java 包名等场景）

**校验**（CLI 执行 `template list` / `init project` 时运行）：
- name 格式与唯一性；path 指向仓库内已存在的目录（禁止绝对路径/越界）
- 目录名 === name；同一目录不被多个 name 引用

## 缓存

CLI 将本仓库克隆到 `~/.agile/templates/<url-hash>`（用户级，跨 workspace 共享），`template list/update` 或 `init project` 时自动同步（`init project` 失联时降级使用本地缓存并提示）。
