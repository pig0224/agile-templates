# {{name}} 项目约定

> 项目级入口索引——只放高频约定与指针，细节按需读 docs/。
> 规范冲突优先级：tech-specs > biz-tech-docs > biz-product-docs > 本项目约定 > 任务 design.md。

## 技术栈

Go + net/http 标准库（无 Web 框架；模板 go-service 生成）

## 命令速查

| 命令 | 用途 |
|---|---|
| `make run` | 本地运行（go run .） |
| `make test` | 全量测试（go test ./... -v） |
| `make build` | 编译产物到 bin/ |
| `make lint` | go vet 静态检查 |

## 硬规则

- 先写失败测试再实现（TDD 红线；Go 用表驱动测试 + `t.Run` 子用例）
- `make lint`（go vet）保持零告警；禁止引入未与负责人确认的第三方依赖（标准库优先）
- 编译产物 bin/、测试缓存不入库（.gitignore 已配置）

## 规范索引

- 本项目约定：[docs/conventions.md](docs/conventions.md)（目录 / 命名 / 测试）、[docs/architecture.md](docs/architecture.md)（架构决策 ADR）
- 团队规范：`../../biz-tech-docs/`——**⛔ 栈领域待人工确认**：AI 首次在本项目工作时，列出 `biz-tech-docs/frameworks/` 实际存在的目录供人工确认，确认后把本行改写为具体领域（如 `frameworks/go/`，附确认人与日期）；**未确认前只引用通用领域，不混入其他技术栈**。路径以 `.agile/settings.json` 的 `paths` 为准
- 公司硬规范：`../../tech-specs/`
- 上层无匹配领域 → 显式提示缺口（`/agile:knowledge capture` 沉淀或 tech-specs 提案），不臆造
