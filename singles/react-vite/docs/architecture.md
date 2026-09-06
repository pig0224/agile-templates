# {{name}} 架构决策记录（ADR）

> 项目级**长期成立**的技术决策登记于此，最新在上，每条三段式：背景 / 决策 / 后果。
> 与 design.md 的分工：design.md 记录单次需求的设计；其中跨需求长期成立的结论，回写为本文件的一条 ADR。

## ADR-001 采用 react-vite 模板初始化（项目创建时）

- **背景**：新建 React 前端项目，选用团队模板 react-vite（Vite + TypeScript + vitest + Playwright）。
- **决策**：以模板初始骨架为基线（见 [conventions.md](conventions.md) 目录结构节）。
- **后果**：后续架构变更（状态管理、路由、接口层方案等）从 ADR-002 起在本文件追加。
