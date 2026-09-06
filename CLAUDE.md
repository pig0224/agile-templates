# CLAUDE.md — agile-templates 仓库导航

本仓库是 **Agile CLI 的项目模板注册中心**：`registry.json`（v2：singles / solutions 全数组，无 path 字段——目录由名字约定派生，`registry.schema.json` 提供字段说明与编辑器校验）声明全部模板，**新增模板无需升级 [agile-cli](https://github.com/pig0224/agile-cli)**（本布局需 CLI ≥ 2.1.0）。以 git 仓库分发，推送即发版，无需 npm、无需构建。

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

用户侧（CLI，本布局需 CLI ≥ 2.1.0）：

```bash
agile template list                                # 列出模板与组合模板（workspace 内外均可；默认读缓存）
agile init project <name> --template <模板名>      # 用单例模板生成项目（落 projects/<name>/）
agile init project <系统标签> --template <组合名>  # 组合模板平铺生成全部成员项目（--member 成员名=目录名 改成员目录名）
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
registry.json               # 注册中心 v2：singles / solutions 全数组（条目 = name + description + language?/framework?）
registry.schema.json        # JSON Schema（字段中文说明；registry.json 的 $schema 指向它，编辑器自动补全校验）
singles/<模板名>/            # 单例模板（一个模板一个完整项目骨架；目录名 = 模板名）
solutions/<组合名>/<成员名>/  # 组合专属成员模板（成员 = 完整项目骨架，可组合级定制，不引用 singles）
docs/registry.md            # 命名规范与防冲突设计（含组合模板）
scripts/check.mjs           # 自含校验脚本（JSON 重复键扫描 + 结构/目录/骨架校验）
```

## 关键约定（防冲突，CLI 与 scripts/check.mjs 双重强制）

1. **三段全局唯一**：模板名 / 组合名 / 成员名互不重名（同一命名空间），格式 `^[a-z][a-z0-9-]*$`
2. **目录由名字约定派生**（registry 无 path 字段）：模板 = `singles/<name>`，成员 = `solutions/<组合>/<成员>`，目录名必须与登记名完全一致且实际存在（一目录一身份）
3. **重复即报错**：JSON 重复键（check.mjs 扫描——JSON.parse 会静默取后者）；singles / solutions / 同组合 projects 数组内 name 重复登记
4. **组合模板**：`projects` 为成员条目数组（与 singles 条目同形状：name + description，language / framework 可选），数组顺序 = 生成顺序；登记与成员目录**双向一致**（每个成员须有 `solutions/<组合>/<成员>/` 目录，组合目录下子目录须全部登记）；成员名全局唯一——成员平铺落盘 `projects/` 后直接占用顶层目录名，与模板/组合同命名空间

> 注：第 1–4 项由 CLI（validateTemplateRepo）与 check.mjs 双重强制（含数组重复登记与组合内幽灵成员目录）；JSON 重复键、未知字段（顶层与条目）、规范骨架三文件（单例模板与组合成员模板同标准）、singles/ 与 solutions/ 整体反向完整性（幽灵单例/幽灵组合目录）与根一级目录白名单**仅 check.mjs 强制**，勿误以为 CLI 也会拦。CI 同样只跑 check.mjs（模板内容不做 CI 构建/测试）。

命名模式：模板 `<技术栈>-<变体>`（`vue3-vite`、`go-service`；扩展示例 `vue3-nuxt`、`go-grpc`、`node-cli`）；组合 `<系统域>-<定位>`（`admin-base`、`crm-base`）；成员名取职责域（`backend`、`frontend`，因全局唯一，避免与既有模板/组合/成员撞名）。

## 模板内容约定

- 占位符：`{{name}}`（**实际落地目录名**：单例 = 项目名，组合成员 = 平铺后的成员目录名）、`{{safeName}}`（Java 包名等安全段），文本文件与目录名都替换
- README 必须写清运行/测试命令（CLI 与插件依赖此约定执行测试）
- 至少包含一个可运行测试（TDD 起点）
- **项目级规范骨架三文件**（缺一不可，`scripts/check.mjs` 强制校验，单例模板与组合成员模板同标准）：
  - `CLAUDE.md`：项目级入口索引（技术栈 / 命令速查 / 硬规则 / 规范索引）；团队规范段写 `../../biz-tech-docs/` 并带**「⛔ 栈领域待人工确认」**标记——AI 首次在项目工作时列出 `frameworks/` 实际目录，经人工确认后改写为具体领域（不预写死栈路径）
  - `docs/conventions.md`：目录 / 命名 / 测试默认值（如实描述模板初始骨架 + 增长建议）+ 团队补充约定节
  - `docs/architecture.md`：ADR 骨架（背景 / 决策 / 后果三段式）+ ADR-001 初始条目
- 前端模板（vue3-vite / react-vite）附赠 `docs/ui.md`：UI 设计 token 与使用规则骨架（**非强制校验**，经 `/agile:init` 约定问答填充）
- 预填内容必须与模板实际一致：命令速查对齐 package.json scripts / Makefile 目标；不臆造模板没有的目录结构
- **新增组合的步骤**：为每个成员建 `solutions/<组合名>/<成员名>/`（复制最接近的单例模板作起点，按组合需求定制）→ 在 registry.json 的 `solutions` 数组登记组合与 `projects` 成员 → `node scripts/check.mjs` 验证双向一致
