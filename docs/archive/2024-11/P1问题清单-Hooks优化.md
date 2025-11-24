# P1级别 React Hooks 优化问题清单

**生成日期**: 2025-11-19
**问题总数**: 19个
**涉及文件**: 13个

---

## 📊 问题汇总

| 优先级 | 文件 | 问题数 | 主要问题类型 |
|--------|------|--------|--------------|
| 🔴 高 | src/app/questions/page.tsx | 4 | 缺失useCallback和useMemo优化 |
| 🔴 高 | src/app/papers/create/page.tsx | 2 | 缺失useCallback和useMemo优化 |
| 🔴 高 | src/app/assignments/page.tsx | 2 | useCallback依赖项过多、函数应移到组件外部 |
| 🔴 高 | src/components/questions/question-basket-drawer.tsx | 2 | 缺失useCallback优化、列表渲染优化 |
| 🟡 中 | src/app/assignments/create/page.tsx | 1 | 缺失useMemo优化 |
| 🟡 中 | src/app/assignments/[id]/page.tsx | 1 | 缺失useCallback优化 |
| 🟡 中 | src/app/assignments/[id]/grade/[submissionId]/page.tsx | 1 | 函数应移到组件外部 |
| 🟡 中 | src/app/classes/page.tsx | 1 | 缺失useCallback优化 |
| 🟡 中 | src/app/classes/[id]/page.tsx | 1 | 缺失useCallback优化 |
| 🟡 中 | src/app/questions/create/page.tsx | 1 | 缺失useCallback优化 |
| 🟡 中 | src/app/my-assignments/page.tsx | 1 | 缺失useMemo优化 |
| 🟡 中 | src/app/my-assignments/[id]/do/page.tsx | 1 | 缺失useCallback优化 |
| 🟡 中 | src/app/page.tsx | 1 | 缺失useCallback优化 |

**总计**: **19个P1问题**

---

## 🔴 高优先级问题详情（本周必须完成）

### 1. src/app/questions/page.tsx - 4个问题

#### 问题1.1: 缺失useMemo优化 (行240-258)
**问题描述**: `highlightMatch` 函数在每次渲染时都会重新创建，且在 map 中被大量调用

**影响**: 性能影响大，表格数据渲染时会频繁调用此函数

**修复方案**:
```typescript
const highlightMatch = useCallback((text: string) => {
  if (!searchText.trim()) return text
  // ... 保持原有逻辑
}, [searchText])
```

#### 问题1.2: 未使用useCallback的事件处理函数 (多处)
**问题描述**: 大量事件处理函数未使用 useCallback：
- `handleAddToBasketAction` (行269-283)
- `handleStartBuildFromBasket` (行302-314)
- `handleExportFromBasket` (行316-349)
- `callDeleteApi` (行351-374)
- `handleDelete` (行376-380)
- `handleBulkDelete` (行382-400)
- `handleBulkExport` (行402-434)
- `handleBulkImport` (行436-475)

**影响**: 每次渲染都会重新创建这些函数，作为 props 传递给 Button 和其他组件

**修复方案**: 为所有事件处理函数添加 useCallback，并正确设置依赖数组

#### 问题1.3: 缺失useMemo优化 (行477-549)
**问题描述**: `columns` 配置在每次渲染时都会重新创建，导致 Table 组件不必要的重新渲染

**影响**: 性能影响大，Table 组件会因为 columns 引用变化而重新渲染

**修复方案**:
```typescript
const columns: ColumnsType<QuestionRecord> = useMemo(() => [
  // ... 保持原有配置
], [searchText, hasQuestionInBasket, handleAddToBasketAction, handleDelete])
```

#### 问题1.4: 缺失useMemo优化 (行551-554)
**问题描述**: `rowSelection` 对象在每次渲染时都会重新创建

**影响**: Table 组件会因为 rowSelection 引用变化而重新渲染

**修复方案**:
```typescript
const rowSelection: TableRowSelection<QuestionRecord> = useMemo(() => ({
  selectedRowKeys,
  onChange: setSelectedRowKeys,
}), [selectedRowKeys])
```

---

### 2. src/app/papers/create/page.tsx - 2个问题

#### 问题2.1: 未使用useCallback的事件处理函数 (多处)
**问题描述**: 大量事件处理函数未使用 useCallback：
- `toggleKnowledgePoint` (行98-104)
- `addRequirement` (行106-108)
- `removeRequirement` (行110-112)
- `updateRequirement` (行114-118)
- `generatePaper` (行120-193)
- `savePaper` (行195-223)
- `getTotalQuestions` (行225-227)
- `removeQuestion` (行230-234)
- `moveQuestionUp` (行236-241)
- `moveQuestionDown` (行243-248)

**影响**: 每次渲染都会重新创建这些函数，特别是在 map 循环中传递时影响更大

**修复方案**: 为所有事件处理函数添加 useCallback，并正确设置依赖数组

#### 问题2.2: 缺失useMemo优化 (行372-386)
**问题描述**: 知识点过滤逻辑在每次渲染时都会执行

**影响**: 当知识点列表较长时，filter 操作会影响性能

**修复方案**:
```typescript
const filteredKnowledgePoints = useMemo(() =>
  knowledgePoints.filter(point => point.includes(searchTerm)),
  [knowledgePoints, searchTerm]
)
```

---

### 3. src/app/assignments/page.tsx - 2个问题

#### 问题3.1: useCallback依赖项问题 (行106-131)
**问题描述**: `deleteAssignment` 的 useCallback 依赖数组包含 `assignments`，但函数内部使用 `setAssignments(prev => ...)` 不需要依赖

**影响**: 每次 assignments 更新时都会重新创建函数，失去 useCallback 的意义

**修复方案**:
```typescript
const deleteAssignment = useCallback(async (id: string) => {
  // ... 保持原有逻辑
}, []) // 移除 assignments 依赖
```

#### 问题3.2: 缺失useMemo优化 (行133-157)
**问题描述**: `getStatusColor` 和 `getStatusText` 函数在每次渲染时都会重新创建

**影响**: 在 map 循环中被调用，导致不必要的函数重新创建

**修复方案**: 移到组件外部定义

---

### 4. src/components/questions/question-basket-drawer.tsx - 2个问题

#### 问题4.1: 未使用useCallback的事件处理函数 (多处)
**问题描述**: `handleClear`, `confirmClear`, `cancelClear`, `handleStartBuild` 函数未使用 useCallback 包裹

**影响**: 每次渲染都会重新创建这些函数，作为 props 传递给子组件

**修复方案**:
```typescript
const handleClear = useCallback(() => {
  if (!questions.length) return
  setClearModalOpen(true)
}, [questions.length])

const confirmClear = useCallback(() => {
  clearBasket()
  deselectAll()
  setClearModalOpen(false)
}, [clearBasket, deselectAll])

const handleStartBuild = useCallback(() => {
  if (!questions.length) return
  onClose()
  onStartBuild()
}, [questions.length, onClose, onStartBuild])
```

#### 问题4.2: 缺失useMemo优化 (行167-224)
**问题描述**: questions.map 循环中有大量的内联函数和计算，每次渲染都会重新执行

**影响**: 当题篮题目较多时，性能影响明显

**修复方案**: 考虑将单个题目抽取为独立的子组件，使用 React.memo 优化

---

## 🟡 中优先级问题详情

### 5. src/app/assignments/create/page.tsx - 1个问题

#### 问题5.1: 缺失useMemo优化 (行160-164)
**问题描述**: `getMinDateTime` 函数在每次渲染时都会重新创建

**影响**: 轻微性能损失，每次组件渲染都会计算时间

**修复方案**:
```typescript
const minDateTime = useMemo(() => {
  const now = new Date()
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset())
  return now.toISOString().slice(0, 16)
}, [])
```

---

### 6. src/app/assignments/[id]/page.tsx - 1个问题

#### 问题6.1: 未使用useCallback的事件处理函数 (行155-175)
**问题描述**: `autoGrade` 函数未使用 useCallback 包裹

**影响**: 每次渲染都会创建新函数实例，虽然当前未作为 props 传递，但逻辑复杂度高

**修复方案**:
```typescript
const autoGrade = useCallback(async (submissionId: string, answers: any) => {
  if (!assignment?.questions) return 0
  // ... 保持原有逻辑
}, [assignment?.questions])
```

---

### 7. src/app/assignments/[id]/grade/[submissionId]/page.tsx - 1个问题

#### 问题7.1: 函数应移到组件外部 (行202-230)
**问题描述**: `getQuestionTypeName`, `getDifficultyName`, `isAnswerCorrect` 这三个纯函数在每次渲染时都会重新创建

**影响**: 这些函数在 map 循环中被调用，导致不必要的函数重新创建

**修复方案**: 移到组件外部定义
```typescript
// 移到组件外部
const getQuestionTypeName = (type: string) => {
  const typeMap: Record<string, string> = {
    'choice': '选择题',
    'fill': '填空题',
    'essay': '解答题'
  }
  return typeMap[type] || type
}
```

---

### 8. src/app/classes/page.tsx - 1个问题

#### 问题8.1: 未使用useCallback的事件处理函数 (行76-93)
**问题描述**: `deleteClass` 函数未使用 useCallback 包裹

**影响**: 每次 classes 更新时都会重新创建函数

**修复方案**:
```typescript
const deleteClass = useCallback(async (id: string) => {
  if (!confirm('确定要删除这个班级吗？班级下的所有作业也会被删除！')) return
  // ... 保持原有逻辑
}, [classes])
```

---

### 9. src/app/classes/[id]/page.tsx - 1个问题

#### 问题9.1: 未使用useCallback的事件处理函数 (行79-103)
**问题描述**: `copyClassCode` 和 `deleteClass` 函数未使用 useCallback 包裹

**影响**: 每次 classData 更新时都会重新创建函数

**修复方案**:
```typescript
const copyClassCode = useCallback(() => {
  if (classData) {
    navigator.clipboard.writeText(classData.class_code)
    alert('班级代码已复制到剪贴板')
  }
}, [classData])

const deleteClass = useCallback(async () => {
  // ... 保持原有逻辑
}, [classId, router])
```

---

### 10. src/app/questions/create/page.tsx - 1个问题

#### 问题10.1: 缺失useCallback优化 (行65-72)
**问题描述**: `onSuccess` 和 `onCancel` 回调函数在每次渲染时都会重新创建

**影响**: 导致 QuestionForm 子组件不必要的重新渲染

**修复方案**:
```typescript
const handleSuccess = useCallback((created) => {
  const targetId = created?.id
  if (targetId) {
    router.push(`/questions/${targetId}`)
  } else {
    router.push('/questions')
  }
  router.refresh()
}, [router])

const handleCancel = useCallback(() => router.push('/questions'), [router])
```

---

### 11. src/app/my-assignments/page.tsx - 1个问题

#### 问题11.1: 缺失useMemo优化 (行125-139)
**问题描述**: `isOverdue` 函数和派生状态计算在每次渲染时都会执行

**影响**: filter 操作每次渲染都执行

**修复方案**:
```typescript
const isOverdue = useCallback((deadline: string) => {
  return new Date(deadline) < new Date()
}, [])

const categorizedAssignments = useMemo(() => ({
  pending: assignments.filter(a => !a.submission_id && !isOverdue(a.deadline)),
  submitted: assignments.filter(a => a.submission_id),
  overdue: assignments.filter(a => !a.submission_id && isOverdue(a.deadline))
}), [assignments, isOverdue])
```

---

### 12. src/app/my-assignments/[id]/do/page.tsx - 1个问题

#### 问题12.1: 未使用useCallback的事件处理函数 (行93-131)
**问题描述**: `handleAnswerChange` 和 `handleSubmit` 函数未使用 useCallback 包裹

**影响**: 每次 answers 状态更新时都会重新创建函数

**修复方案**:
```typescript
const handleAnswerChange = useCallback((questionId: string, answer: string) => {
  setAnswers(prev => ({
    ...prev,
    [questionId]: answer
  }))
}, [])

const handleSubmit = useCallback(async () => {
  // ... 保持原有逻辑
}, [answers, questions.length, assignmentId, user?.id, router])
```

---

### 13. src/app/page.tsx - 1个问题

#### 问题13.1: 未使用useCallback的事件处理函数 (行16-25)
**问题描述**: `loadProfile` 函数未使用 useCallback 包裹

**影响**: 轻微性能损失

**修复方案**:
```typescript
const loadProfile = useCallback(async () => {
  try {
    const data = await getCurrentProfile()
    setProfile(data)
  } catch (error) {
    console.error('Failed to load profile:', error)
  } finally {
    setLoading(false)
  }
}, [])
```

---

## 📋 修复计划

### 第一批（高优先级）
- ✅ src/app/questions/page.tsx
- ✅ src/app/papers/create/page.tsx
- ✅ src/app/assignments/page.tsx
- ✅ src/components/questions/question-basket-drawer.tsx

### 第二批（中优先级）
- ✅ 其余9个文件的单个问题

### 验证
- ✅ 运行E2E测试确保功能正常
- ✅ 性能对比（渲染次数、响应时间）

---

**生成时间**: 2025-11-19
**预计完成时间**: 本周内
