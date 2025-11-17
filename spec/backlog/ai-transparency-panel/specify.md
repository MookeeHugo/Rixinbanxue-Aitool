# AI 决策透明面板 - Specify

## Meta
- **Slug**: ai-transparency-panel
- **Owner**: Hugo / PM
- **Status**: designing
- **Last Update**: 2025-11-14

## 背景
- 老师质疑“AI 真的提效 50% 吗？”（参考执行方案 v2.2）并担心黑盒决策。
- 目前组卷/批改页面只展示结果，没有解释或回退机制。

## 用户痛点 / 动机
- 无法看到题目/评分的选择依据，难以信任自动化流程。
- 当自动结果出错时，缺少回退或人工修改记录。

## 目标 & 成功标准
- 在组卷、批改等 AI 场景提供透明面板：展示输入、候选、置信度、人工修改记录。
- 老师可以一键回退 / 接受 / 反馈，系统记录并学习。
- 透明面板曝光率 ≥80%，人工修订提交率下降 20%。

## 需求描述
- 组件：`DecisionInspector`（tab: 选择摘要 / 算法输入 / 人工修订）。
- 数据：`decision_log` 表记录本次调用（feature、inputs hash、confidence、alternatives）。
- UI 入口：组卷/批改页面 CTA 附近新增“查看透明报告”。
- 支持“回退到上一次人工版本”并记录原因。

## 约束与非目标
- 首版仅覆盖题库组卷、自动批改，其他模块后续再扩展。
- 不做复杂模型训练，只记录日志与基本反馈。

## 依赖
- `papers`, `assignments`, `submissions` 数据流。
- AI 服务/worker 需要把调用上下文写入 `decision_log`。

## 附件
- 参考：`codex测试分析报告.md` Issue #2（无鉴权 token） & Issue #1（构建失败）中提到的风险。
