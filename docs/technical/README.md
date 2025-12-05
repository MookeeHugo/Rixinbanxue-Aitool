# 技术手册索引（docs/technical）

> 更新于 2025-12-03。本目录聚合部署、数据库、第三方服务等技术文档，便于开发与运维统一查阅。

| 文件 | 简介 |
| --- | --- |
| `开发环境快速启动指南.md` | VS Code、Node、Python OCR 依赖的快速安装清单。 |
| `rixinmath-coarse-to-fine-interface.md` | 当前流水线、脚本、监控的权威指南。 |
| `SUPABASE_LOCAL_SETUP.md` / `SUPABASE_SETUP_COMPLETE.md` | 本地与完整 Supabase 环境搭建手册。 |
| `database/README.md` / `database/seed-data-guide.md` | Supabase 项目初始化与测试数据导入流程。 |
| `DATABASE_MANAGEMENT.md` | 数据库结构、迁移、故障排查。 |
| `paddleocr-service.md` | PaddleOCR 布局分析服务部署与调试说明。 |
| `DEPLOYMENT.md` | Next.js/后台部署步骤、CI 注意事项。 |
| `LIVEKIT_SETUP.md` / `LIVE_SESSION_MIGRATION.md` | LiveKit 配置与直播数据迁移。 |
| `chrome-devtools-tool-reference.md` | 前端调试技巧与 DevTools 面板说明。 |
| `performance-monitoring.md` | API/SSE 指标、告警阈值与脚本示例。 |
| `real-time-recording-status.md` | 录制状态 SSE 流程、回调示例与排障指南。 |
| `TYPESCRIPT_IMPROVEMENTS.md` | TS 构建优化、strict 模式踩坑记录。 |
| `Turbo模式问题解决方案.md` | Next.js Turbo 模式相关故障的排查与修复。 |
| `下一步-Sharp图片裁剪问题解决方案.md` | Sharp 图像裁剪失败的权宜方案与后续计划。 |
| `存储配置同步说明.md` | Supabase/R2 等存储配置与同步策略。 |

新增文档时：
1. 放置在本目录或子目录，命名以主题-用途为主。
2. 在此表格追加一行描述用途，保持信息最新。
3. 若替换旧文档，请更新 `docs/project-governance/file-archive-log.md`。
