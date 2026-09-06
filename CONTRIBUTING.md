# 贡献指南（CONTRIBUTING）

感谢关注 agile-templates（项目模板注册中心）！欢迎提交新模板或改进现有模板。

## 环境搭建

```bash
git clone git@github.com:pig0224/agile-templates.git
cd agile-templates
node scripts/check.mjs              # 注册中心一致性校验（零依赖）
```

本地调试（CLI 侧）——临时 workspace + 模板源指向本仓库路径（直读，不走缓存）：

```bash
mkdir ../tpl-check && cd ../tpl-check
agile init workspace
agile config set template-repo /path/to/agile-templates
agile template list
```

## 新增一个单例模板

1. 新建目录 `singles/<模板名>/`（命名 `^[a-z][a-z0-9-]*$`，模式 `<技术栈>-<变体>`）
2. 在 `registry.yaml` 的 `templates:` 登记（`path` 用 `./singles/<name>`）
3. 模板内容要求：
   - 根目录建议含构建特征文件（如 package.json / go.mod / pom.xml）——插件按其发现测试/构建命令；非强制清单（check.mjs 不校验）
   - 占位符 `{{name}}` / `{{safeName}}`（文本文件与目录名都会替换；`{{name}}` = 实际落地目录名）
   - 至少一个可运行测试 + 写明运行/测试命令的 README
   - 项目级规范骨架三文件（CLAUDE.md / docs/conventions.md / docs/architecture.md，check.mjs 强制）
   - 清单类文件中的 `{{name}}` 会被替换为落地目录名——CLI 校验项目名为 `^[a-z][a-z0-9-]*$`，占位符须落在该格式合法的位置（如 go.mod 的 module、package.json 的 name），不要把 `{{name}}` 放进带空格/大写/引号的语法敏感位
4. `node scripts/check.mjs` 全绿后提 PR——CI 只跑该规范校验（模板内容不做 CI 构建/测试），merge 即对所有用户生效

## 新增一个组合模板

1. 为每个成员新建 `solutions/<组合名>/<成员名>/`——**组合专属完整模板骨架**（可复制最接近的单例模板作起点，按组合需求定制；成员与 singles 互不引用）
2. 在 `registry.yaml` 的 `solutions:` 段登记 `members: 成员名清单`（纯名清单如 `backend,frontend`，顺序 = 生成顺序）
3. 命名硬约束：模板名 / 组合名 / 成员名**三段全局唯一**（成员平铺落盘 `projects/` 后直接占用顶层目录名）；每个成员目录必须存在、组合目录下不得有未登记的子目录（双向一致）
4. `node scripts/check.mjs` 全绿后提 PR

## 提交流程

分支开发（`feat/xxx`）→ push → PR 指向 main → CI → 维护者 review 后合并。

## 报告问题

使用 [issue 模板](https://github.com/pig0224/agile-templates/issues/new/choose)。行为准则见 [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md)。
