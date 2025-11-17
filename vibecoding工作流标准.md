# Vibecoding 工作流标准（Win10 + VS Code/Cursor + Codex/ClaudeCode）

适用场景：1 名非技术 PM + 2 个 AI 编程工具，在 Windows10 下使用 VS Code/Cursor 协作开发。目标是保留 “vibe” 的速度感，同时让环境一致、上下文可控、质量可验证、成本可预测。

工作流被拆解为 6 个阶段、18 个步骤。每个步骤都给出“目的 → 工具 → 操作 → 验收”，确保可执行、可回溯。

---

## 阶段 A · 启动准备：统一角色与环境

### A1 角色与协作宪法
- **目的**：AI 知道自己是谁、要遵循的规则，PM 有共同语言。
- **工具**：Spec Kit `/speckit.constitution` + Continue systemMessage + VS Code Snippets。
- **操作**：
  1. 在 `spec/constitution.md` 中写下项目原则（安全、代码规范、测试、禁止 rm/del 等）。
  2. 在 Continue `config.ts` 的 `systemMessage` 字段中粘贴角色背景（参考 12.1）。
  3. 额外在 VS Code `snippets.json` 中创建 `airole_react` 片段，方便临时引用角色。
- **验收**：每次对话开头可输入 `/constitution` 查看规则；AI 回答遵循“先代码、后简述”的语气。

### A2 Dev Containers（解决 Win10 乱码 & 安全隔离）
- **目的**：所有人/AI 共用 UTF-8 的 Linux 环境，避免本机依赖与误删。
- **工具**：`.devcontainer/devcontainer.json` + 可选 `docker-compose.yml`。
- **操作**：
  1. `mkdir -p .devcontainer`，让 AI 生成包含 Node20 + pnpm + Supabase CLI + Postgres/Redis 服务的配置。
  2. VS Code/Cursor 提示 “Reopen in Container” 时选择 “Yes”。
  3. 在 Onboarding 文档中记录 `Dev Containers + just up` 的启动步骤。
- **验收**：`uname -a` 输出 Linux，`echo $LANG` 为 UTF-8；AI 无法访问宿主机磁盘。

### A3 Git 基线
- **目的**：把 Git 当成无限 Ctrl+Z，防止 AI 误操作失控。
- **操作**：
  1. 初始化仓库并创建 `README.md`、`.gitignore`、`.env.example`。
  2. 约定“每完成 1 个任务就 commit”，并熟悉 `git checkout .`、`git clean -fd`、`git reset --hard`、`git reflog`。
  3. 推荐使用 `aider` 执行修改，所有 diff 需在 VS Code 中确认后再提交。
- **验收**：仓库保持干净，误删文件可通过 Git 命令 1 分钟内恢复。

---

## 阶段 B · 基础护栏：格式 / 静态检查 / 提交门禁

### B1 Prettier（风格统一）
- **操作**：
  1. `pnpm add -D prettier`。
  2. 新建 `.prettierrc`（singleQuote true、semi false、tabWidth 2、printWidth 100）。
  3. VS Code 设置 `Format On Save`，默认格式化器选 Prettier。
- **验收**：任意文件 `Ctrl+S` 即自动格式化，无需 PM 手动修饰。

### B2 ESLint（静态质量）
- **操作**：
  1. `pnpm add -D eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin`。
  2. `npx eslint --init` 并扩展 `next/core-web-vitals`、`prettier`。
  3. VS Code 安装 ESLint 插件，保持红/黄波浪线实时提示。
  4. `package.json` 中新增 `"lint": "eslint . --ext ts,tsx,js,jsx"`。
- **验收**：`pnpm lint` 返回 0；AI 生成的代码若出错，能即时看到警示。

### B3 Husky + lint-staged（提交前自动执行）
- **操作**：
  1. `pnpm add -D husky lint-staged && npx husky install`。
  2. `package.json` 中配置 lint-staged 对 staged 文件运行 Prettier + ESLint。
  3. 创建 `.husky/pre-commit`，内容：
     ```bash
     #!/bin/sh
     . "$(dirname "$0")/_/husky.sh"
     npx lint-staged
     ```
- **验收**：若格式或 lint 不通过，`git commit` 会被阻止。

---

## 阶段 C · Grounded Coding 循环：Mock → Storybook → Playwright

### C1 Mock 数据：MSW
- **操作**：
  1. `pnpm add msw`，在 `src/mocks/handlers.ts` 定义 API 响应。
  2. 在入口（如 `src/main.tsx`）加入：
     ```ts
     if (process.env.NODE_ENV === 'development') {
       const { worker } = await import('./mocks/browser')
       worker.start()
     }
     ```
- **验收**：前端/测试的所有请求都返回可预测数据，避免后端未就绪时的幻觉。

### C2 组件沙盒：Storybook
- **操作**：
  1. `npx storybook@latest init`。
  2. AI 生成组件时同步生成 `*.stories.tsx`，描述 default/hover/disabled 等状态。
  3. `pnpm storybook` 后 PM 在浏览器中验收，并可截图反馈。
- **验收**：任一组件能在 Storybook 中预览所有状态，视觉问题在进入主应用前就被发现。

### C3 行为锚点：Playwright
- **操作**：
  1. `pnpm add -D @playwright/test && npx playwright install`。
  2. 使用 `npx playwright codegen http://localhost:3000` 录制成功路径（如登录、布置作业）。
  3. `npx playwright test` 自动执行，失败日志/截图/trace 作为 AI 参考。
- **验收**：每个核心流程都有对应的 Playwright 测试，成功标准 = “通过测试”。

### C4 反馈闭环
1. PM 提需求 → AI 编写组件 & Storybook → PM 验收视觉。
2. PM 录制 Playwright → 运行 → 若失败，将 “组件代码 + 测试脚本 + 报错” 提供给 AI。
3. AI 修复 → 再跑测试 → 通过后提交。

---

## 阶段 D · 上下文与 Prompt 管理

### D1 Continue（智能 RAG + 多模型）
- 设置 `/codebase` 索引整个仓库；提问时只附相关片段，解决上下文限制。
- 在 `config.ts` 内为不同模型指定 `systemMessage`；简单任务走廉价模型，复杂任务走 Claude/GPT-4。

### D2 Aider（Git + Repo Map）
- 在 Dev Container 中运行 `aider --model claude-3-opus`。Aider 自动创建 Repo Map，只把相关文件差异发给 AI，并以 Git diff 展示结果，避免一次性大改。

### D3 VS Code/Cursor 的 @ 引用
- 在聊天中使用 `@workspace`、`@file:src/App.tsx`、粘贴终端错误等方式注入上下文，减少手动复制。

### D4 R-C-T-C-O Prompt 模板
```
Role: 你是精通 Next.js + TypeScript 的首席工程师。
Context:
  - login.tsx: [代码]
  - msw handlers: [mock]
  - playwright 日志: [报错]
Task: 修复 login.tsx，让 login.spec.ts 通过。
Constraints:
  - 不新增第三方库
  - 仅修改 login.tsx
  - 保持现有风格
Output: 只返回完整 login.tsx 代码，不要解释。
```
将模板存放于 `docs/prompts/login_fix.md` 并在 Continue/Aider 中设为预设，确保沟通结构一致。

### D5 System Prompt 策略
- Continue `systemMessage` = AI 的“职业素养”；Spec Kit `/constitution` = “项目法律”；VS Code Snippets 用于临时引用角色。
- 避免 superclaude 式的“天真拼接”，以免浪费 Token。

---

## 阶段 E · 指挥与治理

### E1 Spec Kit 的四步
1. `/speckit.constitution`：写入安全/测试/代码风格/禁止命令等原则。
2. `/speckit.specify`：PM 描述需求和动机。
3. `/speckit.plan`：AI 给出实现方案，PM 在编码前审阅。
4. `/speckit.tasks`：AI 将计划拆成细任务，逐条执行并用 Aider/Git 审核。

### E2 Git 审核
- 每条 `/tasks` 输出都需要通过 `git diff` 审核；必要时提交 PR 由 PM/AI 互审。
- 结合 Husky 的 pre-commit 确保每次提交都已格式化 + lint + 测试。

### E3 Playwright/Storybook/MSW 作为宪法条款
- 在 `/constitution` 中明确：所有新功能必须附 Storybook、MSW mock、Playwright 测试，且 `pnpm test`、`pnpm lint` 必须绿色才允许合并。

---

## 阶段 F · 工具矩阵与快捷命令

| 目标 | 工具 | 快速命令/文件 | 备注 |
| --- | --- | --- | --- |
| 环境 | Dev Containers | `Dev Containers: Reopen in Container` | 彻底解决 Win10 乱码 & 安全问题 |
| Mock | MSW | `pnpm msw:init`（自定义脚本） | 与 Playwright 共用数据 |
| UI 验收 | Storybook | `pnpm storybook` | 视觉反馈更快 |
| E2E | Playwright | `npx playwright codegen` / `npx playwright test` | 成功标准的物理锚点 |
| 上下文 | Continue | `/codebase` / systemMessage | 智能检索，降低 Token |
| 安全执行 | Aider | `aider --model ...` | 对每个 diff 可见可审 |
| 提交守门 | Husky + lint-staged | `.husky/pre-commit` | 失败则阻止提交 |
| 指挥系统 | Spec Kit | `/speckit.*` | 将 PM 需求结构化 |

---

## 附录 · 标准检查清单

- [ ] Dev Container 可正常打开，`npm -v`、`psql` 等命令可用。
- [ ] `.prettierrc` 生效，保存即格式化。
- [ ] `pnpm lint`、`pnpm test`、`npx playwright test` 全部通过。
- [ ] Storybook 能展示所有组件状态。
- [ ] MSW 在开发环境中拦截请求。
- [ ] Continue `/codebase` 已构建索引，systemMessage 已配置。
- [ ] Spec Kit `/constitution` 已创建，AI 回答遵循规则。
- [ ] Git 历史保持“小步提交”，无未跟踪垃圾文件。

> 按照以上流程，即使是非技术 PM 也能在 Win10 + VS Code/Cursor + Codex/ClaudeCode 的组合下建立一个“有 vibe 但不失控”的 AI 协作研发体系。
