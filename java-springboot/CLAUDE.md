# {{name}} 项目约定

> 项目级入口索引——只放高频约定与指针，细节按需读 docs/。
> 规范冲突优先级：tech-specs > biz-tech-docs > biz-product-docs > 本项目约定 > 任务 design.md。

## 技术栈

Spring Boot 3 + Java 21 + Maven（包 `com.example.{{safeName}}`；模板 java-springboot 生成）

## 命令速查

| 命令 | 用途 |
|---|---|
| `mvn spring-boot:run` | 本地运行（:8080，/health 健康检查） |
| `mvn test` | 全量测试 |
| `mvn package` | 打包（target/ 产物不入库） |

## 硬规则

- 先写失败测试再实现（TDD 红线；Controller 用 @WebMvcTest 切片，装配逻辑用 @SpringBootTest）
- 分层不越界：controller 只做协议转换，业务在 service，数据在 repository
- target/ 编译产物不入库（.gitignore 已配置）

## 规范索引

- 本项目约定：[docs/conventions.md](docs/conventions.md)（目录 / 命名 / 测试）、[docs/architecture.md](docs/architecture.md)（架构决策 ADR）
- 团队规范：`../../biz-tech-docs/`——**⛔ 栈领域待人工确认**：AI 首次在本项目工作时，列出 `biz-tech-docs/frameworks/` 实际存在的目录供人工确认，确认后把本行改写为具体领域（如 `frameworks/springboot/`，附确认人与日期）；**未确认前只引用通用领域，不混入其他技术栈**。路径以 `.agile/settings.json` 的 `paths` 为准
- 公司硬规范：`../../tech-specs/`
- 上层无匹配领域 → 显式提示缺口（`/agile:knowledge capture` 沉淀或 tech-specs 提案），不臆造
