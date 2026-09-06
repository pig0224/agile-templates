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

## 新增一个模板

1. 新建目录 `<模板名>/`（命名 `^[a-z][a-z0-9-]*$`，模式 `<技术栈>-<变体>`）
2. 在 `registry.yaml` 的 `templates:` 登记（`path` 缺省 `./<name>`）
3. 模板内容要求：
   - 根目录建议含构建特征文件（如 package.json / go.mod / pom.xml）——插件按其发现测试/构建命令；非强制清单（check.mjs 不校验）
   - 占位符 `{{name}}` / `{{safeName}}`（文本文件与目录名都会替换）
   - 至少一个可运行测试 + 写明运行/测试命令的 README
   - 清单类文件含占位符时注意（如 go.mod），详见 docs/registry.md
4. `node scripts/check.mjs` 全绿后提 PR——CI 会双重校验，merge 即对所有用户生效

## 提交流程

分支开发（`feat/xxx`）→ push → PR 指向 main → CI（check.mjs + CLI 校验）→ 维护者 review 后合并。

## 报告问题

使用 [issue 模板](https://github.com/pig0224/agile-templates/issues/new/choose)。行为准则见 [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md)。
