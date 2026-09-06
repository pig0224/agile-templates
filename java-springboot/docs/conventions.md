# {{name}} 项目约定（目录 / 命名 / 测试）

> 模板 java-springboot 预填的默认值，项目演进时直接在本文件修订与追加。

## 目录结构

模板初始骨架（最小可运行）：

```
src/main/java/com/example/{{safeName}}/
├── Application.java            # 启动类
└── controller/
    └── HealthController.java   # /health 健康检查
src/main/resources/application.yml
src/test/java/.../HealthControllerTest.java
```

增长时的建议布局（按需创建，不预建空目录）：

```
com.example.{{safeName}}/
├── controller/    # REST 接口层（协议转换，不做业务）
├── service/       # 业务逻辑
├── repository/    # 数据访问
└── model/         # 实体 / DTO
```

## 命名约定

- 类 PascalCase；方法与变量 camelCase；常量 UPPER_SNAKE_CASE
- 测试类 `<被测类>Test`，包路径与被测类一致（src/test/java 镜像 src/main/java）
- REST 路径复数资源式（如 `/users`）；DTO 以 `Request` / `Response` 结尾

## 测试约定

- 先写失败测试再实现；切片测试优先（@WebMvcTest / @DataJpaTest），装配验证用 @SpringBootTest
- 测试不依赖外部环境（数据库用内嵌 / Testcontainers，见任务 design.md 决策）

## 团队 / 项目补充约定

（随项目演进在此追加；与上层规范冲突时按 CLAUDE.md 的优先级处理）
