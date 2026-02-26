# 讨论记录归档

> 讨论记录按归属分两类存放：
> - **功能相关** → 跟着 spec 走，存在 `docs/specs/SPEC-XXX/讨论细节/` 目录下
> - **项目级通用** → 存在 `docs/discussions/` 目录下
>
> **生成时机**: 每次协作讨论/重大决策后，必须创建详细文件并在此更新索引。

---

## 快速总结

**技术选型：**
- SSE vs WebSocket：HTTP/2 下 SSE 单连接多路复用消除连接数限制，内存效率高；推荐混合方案（聊天用 WebSocket，通知/事件用 SSE）
- Twitter/X 实时推送架构：WebSocket（双向）+ SSE（单向）+ 多级降级；混合 Fanout 策略

**项目改进：**
- 文档改进：添加截图/架构图/对比表格，新增代码导航和进度文件说明
- 进度索引优化：claude-progress.txt 顶部增加"最近活动"章节
- 外部差评评估：40% 事实错误，30% 合理但不紧急，30% 真问题

---

## 项目级通用

| 日期 | 主题 | 类型 | 决策结果 | 文件 |
|------|------|------|---------|------|
| 2026-02-15 | 进度索引优化 | 协作讨论 | claude-progress.txt 顶部增加"最近活动"章节 | [查看](discussions/2026-02-15-progress-index-optimization.md) |
| 2026-02-15 | 文档改进（吸引力+清晰度） | 项目优化 | 添加截图/架构图/对比表格，新增 CODE_MAP.md 和 PROGRESS_FILES.md | [查看](discussions/2026-02-15-documentation-improvement.md) |
| 2026-02-16 | 外部差评回应与改进评估 | 架构评审 | 40% 事实错误，30% 合理但不紧急，30% 真问题 | [查看](discussions/2026-02-16-external-criticism-review.md) |
| 2026-02-16 | M2.2 前端组件库选型 | 五方讨论 | M2.2 纯 CSS 清理 + stylelint；M3 按需引入 Radix UI | [查看](discussions/2026-02-16-qa-component-library-proposal.md) |
| 2026-02-18 | SSE vs WebSocket 技术调研 | 技术调研 | HTTP/2 下 SSE 消除连接数限制，推荐混合方案 | [查看](discussions/2026-02-18-sse-vs-websocket-research.md) |
| 2026-02-18 | Twitter/X 实时推送架构调研 | 技术调研 | WebSocket + SSE 混合协议；混合 Fanout 策略 | [查看](discussions/2026-02-18-twitter-realtime-push-architecture.md) |

---

## 竞品研究

| 日期 | 主题 | 文件 |
|------|------|------|
| 2026-02-15 | Cat Café 竞品分析 | [查看](runbooks/postmortems/reference-catcafe-analysis.md) |
| 2026-02-15 | Cat Café 经验总结 | [查看](runbooks/postmortems/reference-catcafe-lessons.md) |
| 2026-02-15 | MaiBot 竞品分析 | [查看](runbooks/postmortems/reference-maibot-analysis.md) |
| 2026-02-17 | CIVITAS2 竞品分析 | [查看](runbooks/postmortems/reference-civitas2-analysis.md) |
