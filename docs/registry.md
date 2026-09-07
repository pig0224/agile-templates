# 模板注册中心设计

> 项目模板以独立 git 仓库（本仓库）分发，[Agile CLI](https://github.com/pig0224/agile-cli) 通过 clone 本仓库读取 `registry.json`（v2：singles / solutions 全数组、无 path 字段，目录由名字约定派生；`registry.schema.json` 提供字段说明与编辑器校验）。**新增模板无需升级 CLI**。本布局需 CLI ≥ 2.1.0。2.0.x 只认 v1 旧布局（registry.yaml + path 字段）——本仓已删除 registry.yaml，推送即对 2.0.x 停止可用（读模板源报「缺少 registry.yaml」），存量用户需先升级 CLI ≥ 2.1.0。CLI 侧实现见其 `src/core/template-registry.ts`。

## 1. 仓库结构

```
agile-templates/               # 可整体拆出为独立 git 仓库
├── registry.json              # 注册中心 v2：singles / solutions 全数组（条目 = name + description + language?/framework?）
├── registry.schema.json       # JSON Schema（字段中文说明，编辑器补全校验）
├── singles/                   # 单例模板（一个模板一个完整项目骨架）
│   └── <模板名>/
└── solutions/                 # 组合模板（可选）：一组合一目录，成员 = 组合专属完整模板
    └── <组合名>/
        ├── CLAUDE.md          # 组合根导航：组合定位 / 成员清单 / 耦合资产导航
        ├── docs/              # 跨成员耦合的约定/规范/知识归总处（每篇 frontmatter「类型: tech|product」定同步去向）
        ├── <成员名>/          # 完整项目骨架，可组合级定制（不引用 singles）
        └── ...
```

CLI 侧命令（命令均无 `--registry` 类选项——模板源统一读配置）：

| 命令 | 说明 |
|---|---|
| `agile template list` | 列出模板与组合模板（默认读本地缓存；workspace 外自动用内置官方源） |
| `agile template update` | 强制刷新缓存到注册中心远端最新 |
| `agile template clean` | 清理全部模板缓存（下次使用自动重新克隆） |
| `agile init project [--template <模板或组合模板名>] [--name <目录名 \| 组合项目名称=目录名>]` | 用模板生成项目（`--name` 三模式见下方组合「生成语义」；缺省 `--template` 为空项目骨架且 `--name <目录名>` 必填） |

模板源解析：workspace 内读 `.agile/settings.json` 的 `templates.registry`（init workspace 时写入，默认官方地址，`agile config set template-repo <git-url>` 可换团队私有仓库或本地路径）；workspace 外用内置官方源。指向本地目录时**直读不走缓存**（本地调试模板用）。

## 2. 命名规范与防冲突设计

**模板如何被找到**：条目 name = 模板目录名（组合成员 = `solutions/<组合>/<name>/`），两者必须一致。CLI 通过「name → registry 条目 → 目录」一条链定位，无歧义（无 path 字段，杜绝别名指向）。

**init 后的目录形态**：单例与组合成员**全部平铺**落盘 `projects/<目录名>/`（无系统目录层级）——因此模板名 / 组合名 / 成员名处于**同一命名空间**，三段必须全局唯一。

**防冲突五道防线**（`validateTemplateRepo` 运行时强制执行，`init project` 发现任何问题直接拒绝生成）：

1. **命名规范**：`^[a-z][a-z0-9-]*$`（小写字母开头，仅小写字母/数字/连字符）——排除大小写歧义、空格、下划线等易混形态
2. **重复即报错**：JSON 重复键由 check.mjs 显式扫描（JSON.parse 对重复键静默取后者）；singles / solutions / 同组合 projects 数组内 name 重复登记均拒绝（JSON 数组无键唯一性保证，须显式校验）
3. **目录名 === name**：一个目录一个身份——registry 无 path 字段，目录由名字约定派生（单例 `singles/<name>/`、成员 `solutions/<组合>/<name>/`），杜绝别名指向
4. **登记与目录双向一致**：登记的模板/成员目录必须实际存在（幽灵登记报错）；组合目录下的子目录必须全部登记进 projects（幽灵成员目录报错，CLI 与 check.mjs 双重）；singles/ 与 solutions/ 整体反向——未登记的目录必须全部登记（幽灵单例/幽灵组合报错，仅 check.mjs 强制）
5. **三段全局唯一**：成员名不得与任何模板名 / 组合名 / 其他组合的成员名重名（成员平铺落盘会抢占 `projects/` 顶层目录名）；组合目录 ↔ projects 双向一致（缺成员目录 / 幽灵成员目录均报错）

此外 `scripts/check.mjs` 还强制**根一级目录白名单**（仅允许 singles / solutions / docs / scripts 与隐藏目录，其余报错——新增顶层目录须改 check.mjs 白名单）与模板内容卫生校验（见 §4）。

**命名建议**：模板 `<技术栈/框架>-<变体>`（`vue3-vite`、`go-service`、`java-springboot`、`node-lib`；扩展示例 `vue3-nuxt`、`go-grpc`、`node-cli`）；成员名取职责域（`backend`、`frontend`），避开既有模板名。

**未来多模板源**：如需同时接多个模板仓库，限定名 `<source>:<name>` 消除跨源同名（当前单源设计，未启用）。

### 组合模板（solutions 数组）

组合模板 = 技术栈模板之上的**声明式组合层**：一次 `init project` 平铺生成多个成员项目（如通用后台 = 前端 + 后端）。与 v1 旧版（成员引用 singles 模板）不同，**成员是组合专属的完整模板骨架**——可为同一职责域在不同组合里做差异化定制（如 admin-base 的 backend 偏管理端、crm-base 的 backend 偏销售漏斗），互不影响 singles。

```json
{
  "name": "admin-base",
  "description": "通用后台基础系统",
  "projects": [
    { "name": "backend", "description": "后端服务（Go）" },
    { "name": "frontend", "description": "前端应用（Vue 3）" }
  ]
}
```

- **成员条目与 singles 同形状**：`name` + 一句话 `description`（language / framework 可选），`projects` 数组顺序 = 生成顺序
- **成员 = 目录**：每个成员必须存在 `solutions/<组合名>/<成员名>/` 目录（完整项目骨架，含规范骨架三文件），组合目录下的子目录也必须全部登记进 projects（双向一致，check.mjs 与 CLI 双重校验；组合根 `docs/` 豁免——它是耦合资产目录，不是成员）
- **组合根耦合资产（两件套，check.mjs 强制）**：组合根必须有 `CLAUDE.md`（组合定位 / 成员清单 / 耦合资产导航）与 `docs/`（≥1 篇 .md）。**跨成员共享的约定/规范/知识一律归总到这里，不写进成员项目**——成员平铺落盘后若各带副本，知识就散落 `projects/`，违背 workspace「1 根 5 抽屉」范式（知识归抽屉：biz-tech-docs / biz-product-docs）。每篇 docs/*.md 顶部 frontmatter 须含 `类型: tech|product`（决定 `/agile:knowledge` 同步去向：tech → biz-tech-docs，product → biz-product-docs）；组合根资产不做 `{{name}}` 占位替换（与具体落盘目录名无关，含占位符即报错）
- **命名**：组合名规范同模板名且**全局唯一**（不得与模板/成员/其他组合重名）；建议 `<系统域>-<定位>`，如 `admin-base`
- **生成语义**：`agile init project --template <组合名> [--name <组合项目名称>=<目录名>]...` 将成员**平铺**落盘 `projects/<成员目录名>/`（输出汇报以组合名为标签）；`--name` 缺省时各成员用组合项目名称（登记成员名）落盘；成员项目 `{{name}}` = 实际落地目录名（平铺目录名全局唯一，包名天然唯一）；全部成员成功后 CLI 自动把组合根两件套快照到 workspace `.agile/solutions/<组合名>/`（与生成清单同为入库资产，快照已存在则跳过不覆盖），`/agile:knowledge sync-template` 从该快照按类型同步进抽屉
- **补缺与生成清单**：成功生成成员后，CLI 在 workspace 写生成清单 `.agile/manifests/<成员目录名>.json`（随项目 git add 入库）。重跑防护四态：清单一致 → 跳过 + warn（补缺语义）；清单不符（缺文件/多文件，疑似上次 init 中途失败的残留）→ 硬错误，删除该目录重跑（2.4.0 起 `--force` 已删除）；无清单的陌生目录（同名普通项目、手写项目、旧版 CLI 生成）→ 维持跳过 + warn（人工核对；AI 层 `/agile:init` 生成前会先做撞名核对）；空目录 → 放行生成（无内容损失）。补缺按**本次调用的有效成员目录名**判定——覆盖过的成员再跑时须带相同 `--name` 键值

**新增组合的步骤**：为每个成员建 `solutions/<组合名>/<成员名>/`（复制最接近的单例模板作起点；无对应技术栈单例的成员从零手写——依赖版本须实查、配置形态对齐上游脚手架，详见 `/agile:add-template`）→ 在 `solutions` 数组登记组合与 `projects` 成员 → 建组合根两件套（`CLAUDE.md` 导航 + `docs/` 归总跨成员耦合资产，判据与 frontmatter 要求见上）→ `node scripts/check.mjs` 验证。

**模板的两条生产路径**：**正向建设**用插件命令 `/agile:add-template`（在模板仓根目录执行——A 从零手写 / B 派生改造 / C 上游脚手架引入 / D 组合模板四种流程）；**反向沉淀**用 `/agile:share-template`（在 workspace 内执行——把既有项目连同沉淀的规范与知识打包为模板：清理审计、占位符逆向还原、registry.json 登记、check + 冒烟，产物落盘到本仓 `singles/` 或 `solutions/`）。两条路径产物同构，登记与校验要求一致（均含组合根两件套要求）；源项目全程只读，一切修改只发生在本仓副本。

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
- `{{name}}` → **实际落地目录名**（单例 = `--name` 裸值或单例项目名称；组合成员 = 平铺后的成员目录名，含 `--name` 键值覆盖）
- `{{safeName}}` → 小写字母数字折叠（Java 包名等场景）

**git 语义**：模板仓库自身的 `.gitignore` 等不影响生成项目；生成项目是 workspace 单仓内的**普通目录**，CLI 生成后逐项目 `git add` 纳入 workspace 版本管理（不自动 commit）。

**模板质量要求**（PR 检查项；其中无产物入库 / package.json 占位符 / README 测试命令 / 项目级规范骨架三文件由 `scripts/check.mjs` 强制校验，违规即 CI 红）：
- **无产物入库**：`singles/` 与 `solutions/` 全树不得出现安装/构建产物——目录 `node_modules` / `.next` / `dist` / `build` / `coverage` / `.turbo` / `.vitest`，文件 `pnpm-lock.yaml` / `package-lock.json` / `yarn.lock` / `*.tsbuildinfo`；符号链接/junction 一并报错。跑完 install/build/test 后清理再提交；确需携带的特例在 `scripts/check.mjs` 顶部 `ALLOWED_ARTIFACTS` 人工显式登记（默认空，不做自动豁免）
- **package.json 占位符**：含 `package.json` 的模板/成员，`name` 必须严格为 `{{name}}`（防固定名、防占位符被误替换后提交）
- **README 测试命令**：每个 README 说明运行/测试命令（CLI 与插件依赖此约定执行测试）——`scripts/check.mjs` 以宽松正则校验测试命令存在性（npm/pnpm/yarn/make/go/mvn 形态；定位为防呆，允许漏报不允许误伤）
- 至少包含一个可运行的测试（TDD 起点模板）
- Java 模板的包目录用 `{{safeName}}` 占位
- **项目级规范骨架三文件**（缺一不可，`scripts/check.mjs` 强制校验，单例模板与组合成员模板同标准）：`CLAUDE.md`（项目级入口索引：技术栈 / 命令速查 / 硬规则 / 规范索引，其中团队规范段带「⛔ 栈领域待人工确认」标记）、`docs/conventions.md`（目录 / 命名 / 测试默认值 + 团队补充约定节）、`docs/architecture.md`（ADR 骨架）——`init project` 生成项目时随模板带出，作为项目级规范的基础入口；前端模板另附 `docs/ui.md`（UI 设计 token 与使用规则骨架，**非强制校验**，经 `/agile:init` 约定问答填充）
- **组合根耦合资产两件套**（组合模板，`scripts/check.mjs` 强制校验）：组合根 `CLAUDE.md` 与 `docs/`（≥1 篇 .md）必须存在；每篇 docs/*.md 顶部 frontmatter 须含 `类型: tech|product`（`/agile:knowledge` 按此同步到 biz-tech-docs / biz-product-docs）；组合根资产含 `{{name}}` / `{{safeName}}` 占位符即报错（组合级资产不做占位替换）——语义见 §2「组合根耦合资产」

**产物忽略**：模板目录里的安装/构建产物（`node_modules`、`dist`、`.next` 等）、符号链接/junction 与锁文件（`pnpm-lock.yaml` 等）不会进入生成项目——CLI 复制时自动忽略并逐项 warn 提示（本地调试期间无需清理产物）。但**提交入库前应清理**（`/agile:add-template` ③ 出口检查含清单与命令）——保持模板仓无产物是建设基线，勿依赖 CLI 的复制防御积累产物（CLI ≤ 2.1.0 直读含产物模板仓会崩溃）。
