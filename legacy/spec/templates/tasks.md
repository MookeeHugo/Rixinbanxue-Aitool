# /speckit.tasks 模板

> 将 plan 拆成可执行任务，可跟踪状态。复制到 `spec/backlog/<slug>/tasks.md`。

| 编号 | 描述 | Owner | 状态 | 验证 | 备注 |
| --- | --- | --- | --- | --- | --- |
| T1 | … | … | todo | e.g. `npm run build`、截图 | 依赖 XXX |

- 状态枚举：`todo / doing / review / done / blocked`。
- 每次状态变化请附上 commit/PR 链接或测试证据。
- 任务完成后，在 `Definition of Done` 下记录 Checklist（如“API 落库 + 计划更新 + 文档”）。
