# {{name}} 项目约定（目录 / 命名 / 测试）

> 模板 go-service 预填的默认值，项目演进时直接在本文件修订与追加。

## 目录结构

模板初始骨架（单文件最小可运行）：

```
main.go       # 入口 + HTTP 路由（net/http）
main_test.go  # 冒烟测试
Makefile      # run / test / build / lint
```

增长时的建议布局（按需创建，不预建空目录）：

```
cmd/server/        # main() 只做装配，业务下沉 internal
internal/          # 私有代码：handler/ service/ repository/ 分层
internal/<x>/xxx_test.go  # 测试与被测包同目录
```

（Go 包结构惯例：拆包的时机由 internal 内聚性决定，不为拆而拆。）

## 命名约定

- 包名全小写短词；导出标识符必须有文档注释（`// Xxx ...`）
- 接口定义在使用方一侧（`Xxxer` 命名，如 `Reader`）；错误用 `fmt.Errorf("...: %w", err)` 包装

## 测试约定

- 表驱动测试（`tests := []struct{ name string; ... }` + `t.Run`），先写失败测试再实现
- 单元测试不依赖网络 / 数据库（依赖以接口注入）；对外接口的端到端验证见任务 run-test.md
- 运行产物 bin/ 不入库

## 团队 / 项目补充约定

（随项目演进在此追加；与上层规范冲突时按 CLAUDE.md 的优先级处理）
