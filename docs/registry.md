# 模板注册中心设计

> 项目模板以独立 git 仓库（本仓库）分发，[agile CLI](https://github.com/fcc-agile/agile-cli) 通过 clone 本仓库读取 `registry.yaml`。**新增模板无需升级 CLI**。CLI 侧实现见其 `src/core/template-registry.ts`。

## 1. 仓库结构

```
agile-templates/          # 可整体拆出为独立 git 仓库
├── registry.yaml         # 注册中心：name → { description, language, framework, path }
├── vue3-vite/            # 每个模板一个目录（目录名 = 模板名）
├── react-vite/
├── go-service/
├── java-springboot/
└── node-lib/
```

CLI 侧命令：

| 命令 | 说明 |
|---|---|
| `agile template list [--registry url] [--no-refresh] [--json]` | 列出模板（默认联网刷新缓存） |
| `agile template update [--registry url]` | 强制刷新缓存 |
| `agile template check [--registry url]` | 注册中心一致性校验（CI 用） |
| `agile init project <name> --template <模板名>` | 用模板生成项目 |

模板源解析优先级：`--registry` 参数 > `workspace.yaml templates.registry`（init workspace 时写入，默认官方地址，可指向团队私有仓库）。

## 2. 命名规范与防冲突设计

**模板如何被找到**：模板名 = registry.yaml 的 key = 模板目录名，三者必须一致。CLI 通过「name → registry 条目 → 目录」一条链定位，无歧义。

**防冲突四道防线**（`validateTemplateRepo` 运行时强制执行，`init project` 发现任何问题直接拒绝生成）：

1. **命名规范**：`^[a-z][a-z0-9-]*$`（小写字母开头，仅小写字母/数字/连字符）——排除大小写歧义、空格、下划线等易混形态
2. **key 唯一**：YAML 解析器对重复 key 直接抛错
3. **目录名 === name**：一个目录一个身份，禁止别名指向同一模板（registry 中两个 name 指向同一目录 → 报错）
4. **path 合法性**：禁止绝对路径与 `..` 越界，path 必须指向仓库内已存在目录

**命名建议**：`<技术栈/框架>-<变体>`，如 `vue3-vite`、`go-service`、`java-springboot`、`node-lib`；扩展示例：`vue3-nuxt`、`go-grpc`、`node-cli`。

**未来多模板源**：如需同时接多个模板仓库，限定名 `<source>:<name>` 消除跨源同名（当前单源设计，未启用）。

## 3. 缓存机制

```
~/.agile/templates/<url名-slug>-<md5(url)前8位>/    # 用户级缓存，跨 workspace 共享
```

- 首次使用：`git clone --depth 1 <registry-url>`
- 刷新：`git fetch origin` + `reset --hard FETCH_HEAD`（缓存是纯只读副本，强重置安全）
- 失联降级：fetch 失败且已有缓存 → 使用缓存并提示 `stale`
- 本地路径 URL 附加 `-c protocol.file.allow=always`（git 安全默认）

## 4. 模板内容约定

**占位符替换**（CLI 的 `src/core/scaffold.ts`，文本文件与目录名都替换）：
- `{{name}}` → 项目名（用户输入，保留大小写与连字符）
- `{{safeName}}` → 小写字母数字折叠（Java 包名等场景）

**git 语义**：模板仓库自身的 `.gitignore` 等不影响生成项目；脚手架生成后 CLI 会 `git init` + 初始提交再挂载为 submodule（详见 [sync-engine.md](./sync-engine.md)）。

**模板质量要求**（PR 检查项）：
- 每个 README 说明运行/测试命令（CLI 与插件依赖此约定执行测试）
- 至少包含一个可运行的测试（TDD 起点模板）
- Java 模板的包目录用 `{{safeName}}` 占位
