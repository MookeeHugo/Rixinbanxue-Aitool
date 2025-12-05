# 学习情绪追踪 - Tasks

| 编号 | 描述 | Owner | 状态 | 验证 | 备注 |
| --- | --- | --- | --- | --- | --- |
| E1 | 设计 `emotion_insights` / `interview_notes` 表 + RLS | Data | todo | `db/schema.sql` 更新 | 含 `evidence_refs` 数组 |
| E2 | Prompt builder + GPT-5.1 调用封装 | Backend/AI | todo | 单元测试：示例输入→固定 JSON | 引用模板见 [ai-prompt-templates.md](../../docs/operations/ai-prompt-templates.md) 技巧 7 |
| E3 | API `POST /api/emotion-insights/generate` | Dev | todo | `npm run build` | 校验 teacher 权限 |
| E4 | `EmotionTrend` 组件 + 引用到通知 | Frontend | todo | 手动跑完流程并录屏 | 需要 charts 库 |
| E5 | 审计/权限/导出 | DevOps | todo | 访问日志 + 导出 CSV 通过 |  
| E6 | 教学手册 & FAQ | PM | todo | docs 更新 + 截图 | 强调共情话术 |

> DoD：老师导入访谈记录→生成情绪趋势→可复制建议到通知，且日志/权限合规。
