# CLAUDE.md — agile-templates 仓库导航

本仓库是 **Agile CLI 的项目模板注册中心**：`registry.yaml` 声明全部模板，**新增模板无需升级 [agile-cli](https://github.com/pig0224/agile-cli)**。以 git 仓库分发，推送即发版，无需 npm、无需构建。

## 协作红线（优先级最高）

1. **绝对不允许执行 `git add`**：哪些变更进入提交，由人工审阅决定。完成修改后，列出变更文件清单与建议的 commit message，等待人工 add。
2. **人工 add 完成后，可汇总执行 `git commit`**：但 commit 前必须先 `git status` 检查——若仍有本次变更相关的未暂存文件，停下来提醒人工补充 add（不得自行 add）；确认全部已暂存后才执行 commit。
3. **不允许执行 `git push`**（含 tag 推送）：推送一律人工处理。
4. **决不允许发版**：创建/推送 tag、触发 Release workflow、创建 GitHub Release 等一切发版动作，只能由人工处理。
5. 只读 git 命令（status / log / diff / blame / fetch）不受限制。

## 常用命令

```bash
node scripts/check.mjs                   # 注册中心一致性校验（CI 同款，无外部依赖）
```

用户侧（CLI）：

```bash
agile template list                                # 列出模板（workspace 内外均可；默认读缓存）
agile init project <name> --template <模板名>      # 用模板生成项目
```

本地调试本仓库模板（模板源直读本地路径，不走缓存）：

```bash
mkdir ../tpl-check && cd ../tpl-check
agile init workspace
agile config set template-repo <本仓库绝对路径>
agile template list
```

## 结构

```
registry.yaml          # 注册中心：name → { description, language, framework, path }
vue3-vite/             # 每个模板一个目录（目录名 = 模板名）
react-vite/  go-service/  java-springboot/  node-lib/
docs/registry.md       # 命名规范与防冲突设计
scripts/check.mjs      # 自含校验脚本
```

## 关键约定（防冲突，CLI 与 scripts/check.mjs 双重强制）

1. 模板名 `^[a-z][a-z0-9-]*$`，全局唯一
2. **目录名必须与 registry.yaml 登记名完全一致**（一目录一身份）
3. `path` 缺省 `./<name>`；禁止绝对路径 / `..` 越界
4. 同一目录不得被多个 name 引用；YAML 重复键直接报错

命名模式 `<技术栈>-<变体>`：`vue3-vite`、`go-service`；扩展示例 `vue3-nuxt`、`go-grpc`、`node-cli`。

## 模板内容约定

- 占位符：`{{name}}`（项目名）、`{{safeName}}`（Java 包名等安全段），文本文件与目录名都替换
- README 必须写清运行/测试命令（CLI 与插件依赖此约定执行测试）
- 至少包含一个可运行测试（TDD 起点）
- **项目级规范骨架三文件**（缺一不可，`scripts/check.mjs` 强制校验）：
  - `CLAUDE.md`：项目级入口索引（技术栈 / 命令速查 / 硬规则 / 规范索引）；团队规范段写 `../../biz-tech-docs/` 并带**「⛔ 栈领域待人工确认」**标记——AI 首次在项目工作时列出 `frameworks/` 实际目录，经人工确认后改写为具体领域（不预写死栈路径）
  - `docs/conventions.md`：目录 / 命名 / 测试默认值（如实描述模板初始骨架 + 增长建议）+ 团队补充约定节
  - `docs/architecture.md`：ADR 骨架（背景 / 决策 / 后果三段式）+ ADR-001 初始条目
- 预填内容必须与模板实际一致：命令速查对齐 package.json scripts / Makefile 目标；不臆造模板没有的目录结构
