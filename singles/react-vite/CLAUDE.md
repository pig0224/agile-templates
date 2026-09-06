# {{name}} 项目约定

> 项目级入口索引——只放高频约定与指针，细节按需读 docs/。
> 规范冲突优先级：tech-specs > biz-tech-docs > biz-product-docs > 本项目约定 > 任务 design.md。

## 技术栈

React + Vite + TypeScript（模板 react-vite 生成）

## 命令速查

| 命令 | 用途 |
|---|---|
| `npm run dev` | 本地开发服务器 |
| `npm run build` | 类型检查 + 生产构建（tsc -b && vite build） |
| `npm test` | vitest 单元测试 |
| `npm run e2e` | Playwright e2e（固化脚本在 e2e/；首次先 `npx playwright install chromium`） |

## 硬规则

- 组件先写失败测试再实现（TDD 红线，轻量通道也不豁免）
- 运行产物（test-results/、playwright-report/、coverage/、dist/）不入库（.gitignore 已配置）
- e2e 只覆盖关键路径；主工具 Playwright，辅助调试 Chrome DevTools

## 规范索引

- 本项目约定：[docs/conventions.md](docs/conventions.md)（目录 / 命名 / 测试）、[docs/architecture.md](docs/architecture.md)（架构决策 ADR）、[docs/ui.md](docs/ui.md)（UI 设计 token 与使用规则）
- 团队规范：`../../biz-tech-docs/`——**⛔ 栈领域待人工确认**：AI 首次在本项目工作时，列出 `biz-tech-docs/frameworks/` 实际存在的目录供人工确认，确认后把本行改写为具体领域（如 `frameworks/react/`，附确认人与日期）；**未确认前只引用通用领域，不混入其他技术栈**。路径以 `.agile/settings.json` 的 `paths` 为准
- 公司硬规范：`../../tech-specs/`
- 上层无匹配领域 → 显式提示缺口（`/agile:knowledge capture` 沉淀或 tech-specs 提案），不臆造
