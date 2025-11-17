# 日新平台代码规范

## 📋 目录
- [TypeScript 规范](#typescript-规范)
- [React 组件规范](#react-组件规范)
- [样式规范](#样式规范)
- [命名规范](#命名规范)
- [文件组织](#文件组织)
- [Git 提交规范](#git-提交规范)

---

## TypeScript 规范

### 1. 类型定义

#### ✅ 优先使用 interface 定义对象类型
```typescript
// ✅ 推荐
interface User {
  id: string;
  name: string;
  email: string;
  role: 'teacher' | 'student';
}

// ❌ 避免（除非需要联合类型）
type User = {
  id: string;
  name: string;
}
```

#### ✅ 使用 type 定义联合类型和工具类型
```typescript
// ✅ 推荐
type UserRole = 'teacher' | 'student';
type QuestionType = 'choice' | 'fill' | 'essay';
type Nullable<T> = T | null;
```

#### ✅ 导出共享类型
```typescript
// src/types/database.ts
export interface Question {
  id: string;
  type: QuestionType;
  content: string;
  answer: string;
}

// 在其他文件中导入
import type { Question } from '@/types/database';
```

### 2. 严格类型检查

#### ✅ 避免使用 any
```typescript
// ❌ 避免
function processData(data: any) {
  return data.value;
}

// ✅ 推荐
function processData(data: { value: string }) {
  return data.value;
}

// ✅ 或使用泛型
function processData<T extends { value: string }>(data: T) {
  return data.value;
}
```

#### ✅ 使用可选链和空值合并
```typescript
// ✅ 推荐
const userName = user?.profile?.name ?? '匿名用户';

// ❌ 避免
const userName = user && user.profile && user.profile.name ? user.profile.name : '匿名用户';
```

### 3. 函数类型

#### ✅ 明确函数返回类型
```typescript
// ✅ 推荐
async function fetchUser(id: string): Promise<User | null> {
  const response = await fetch(`/api/users/${id}`);
  if (!response.ok) return null;
  return response.json();
}

// ❌ 避免（缺少返回类型）
async function fetchUser(id: string) {
  const response = await fetch(`/api/users/${id}`);
  return response.json();
}
```

---

## React 组件规范

### 1. 组件结构

#### ✅ 推荐的组件结构
```tsx
'use client'; // 如果需要客户端组件

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useUserStore } from '@/stores/userStore';
import type { User } from '@/types/database';

// Props 类型定义
interface UserCardProps {
  user: User;
  onEdit?: (user: User) => void;
  className?: string;
}

// 组件定义
export default function UserCard({ user, onEdit, className }: UserCardProps) {
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    // 副作用逻辑
  }, []);

  const handleSubmit = () => {
    // 事件处理逻辑
  };

  return (
    <div className={className}>
      {/* JSX */}
    </div>
  );
}
```

### 2. 客户端 vs 服务端组件

#### ✅ 默认使用服务端组件
```tsx
// src/app/users/page.tsx
// 无需 'use client' - 默认是服务端组件
export default async function UsersPage() {
  const users = await fetchUsers(); // 可以直接调用数据库

  return (
    <div>
      {users.map(user => (
        <UserCard key={user.id} user={user} />
      ))}
    </div>
  );
}
```

#### ✅ 需要交互时使用客户端组件
```tsx
// src/components/UserForm.tsx
'use client'; // 需要状态和事件处理

import { useState } from 'react';
import { Button } from '@/components/ui/button';

export default function UserForm() {
  const [name, setName] = useState('');

  return (
    <form>
      <input value={name} onChange={(e) => setName(e.target.value)} />
      <Button type="submit">提交</Button>
    </form>
  );
}
```

### 3. Hooks 使用规范

#### ✅ 自定义 Hook 命名以 use 开头
```typescript
// src/hooks/useAuth.ts
export function useAuth() {
  const { user, setUser } = useUserStore();

  const login = async (email: string, password: string) => {
    // 登录逻辑
  };

  const logout = () => {
    setUser(null);
  };

  return { user, login, logout };
}
```

#### ✅ Hook 依赖数组完整性
```typescript
// ✅ 推荐
useEffect(() => {
  fetchData(userId);
}, [userId]); // 包含所有依赖

// ❌ 避免
useEffect(() => {
  fetchData(userId);
}, []); // 缺少 userId 依赖
```

### 4. 条件渲染

#### ✅ 使用简洁的条件渲染
```tsx
// ✅ 推荐
{user && <UserProfile user={user} />}
{isLoading ? <Spinner /> : <Content />}
{items.length > 0 && <List items={items} />}

// ❌ 避免
{user !== null && user !== undefined ? <UserProfile user={user} /> : null}
```

---

## 样式规范

### 1. Tailwind CSS 优先

#### ✅ 使用 Tailwind 类名
```tsx
// ✅ 推荐
<div className="flex items-center gap-4 p-6 rounded-lg bg-card border border-border">
  <h2 className="text-2xl font-semibold">标题</h2>
</div>

// ❌ 避免内联样式
<div style={{ display: 'flex', padding: '24px' }}>
  <h2 style={{ fontSize: '24px' }}>标题</h2>
</div>
```

### 2. 使用设计系统变量

#### ✅ 使用语义化 CSS 变量
```tsx
// ✅ 推荐
<div className="bg-primary text-primary-foreground">主色块</div>
<div className="bg-card text-card-foreground border-border">卡片</div>
<p className="text-muted-foreground">辅助文字</p>

// ❌ 避免硬编码颜色
<div className="bg-purple-500 text-white">主色块</div>
```

### 3. 响应式设计

#### ✅ 移动端优先
```tsx
// ✅ 推荐 - 从小屏幕到大屏幕
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {/* 移动端1列，平板2列，桌面3列 */}
</div>

<p className="text-sm md:text-base lg:text-lg">
  响应式文字
</p>
```

### 4. 组件样式组合

#### ✅ 使用 cn() 工具函数
```tsx
import { cn } from '@/lib/utils';

function Button({ variant, className, ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "px-4 py-2 rounded-md font-medium",
        variant === "primary" && "bg-primary text-primary-foreground",
        variant === "secondary" && "bg-secondary text-secondary-foreground",
        className
      )}
      {...props}
    />
  );
}
```

---

## 命名规范

### 1. 文件命名

```
src/
├── app/
│   ├── page.tsx              // 页面文件使用 page.tsx
│   ├── layout.tsx            // 布局文件使用 layout.tsx
│   └── users/
│       └── [id]/
│           └── page.tsx      // 动态路由
├── components/
│   ├── ui/                   // shadcn/ui 组件 (小写-连字符)
│   │   ├── button.tsx
│   │   └── card.tsx
│   └── UserCard.tsx          // 业务组件 (PascalCase)
├── lib/
│   ├── utils.ts              // 工具函数 (camelCase)
│   └── storage.ts
├── stores/
│   └── userStore.ts          // Zustand store (camelCase + Store)
└── types/
    └── database.ts           // 类型定义 (camelCase)
```

### 2. 变量命名

```typescript
// ✅ 推荐
const userName = 'John';              // camelCase
const MAX_RETRY_COUNT = 3;            // 常量 UPPER_SNAKE_CASE
const isLoading = false;              // 布尔值以 is/has/should 开头

interface UserProfile { }             // PascalCase
type QuestionType = 'choice';         // PascalCase
enum UserRole { Teacher, Student }    // PascalCase

function fetchUserData() { }          // camelCase
```

### 3. 组件 Props 命名

```typescript
interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;           // 事件处理器以 on 开头
  isLoading?: boolean;            // 布尔属性以 is/has/should 开头
  variant?: 'primary' | 'secondary';
  className?: string;
}
```

---

## 文件组织

### 1. 目录结构

```
src/
├── app/                    # Next.js 13+ App Router 页面
│   ├── (auth)/            # 路由分组
│   │   ├── login/
│   │   └── register/
│   ├── api/               # API 路由
│   │   └── users/
│   ├── layout.tsx
│   └── page.tsx
├── components/            # React 组件
│   ├── ui/               # shadcn/ui 基础组件
│   └── features/         # 业务功能组件
├── lib/                  # 工具函数和配置
│   ├── utils.ts
│   ├── supabase.ts
│   └── storage.ts
├── stores/               # Zustand 状态管理
│   ├── userStore.ts
│   └── questionBasketStore.ts
├── types/                # TypeScript 类型定义
│   └── database.ts
├── hooks/                # 自定义 React Hooks
│   └── useAuth.ts
└── styles/               # 全局样式
    └── globals.css
```

### 2. 导入顺序

```typescript
// 1. React 和 Next.js
import { useState, useEffect } from 'react';
import Link from 'next/link';

// 2. 第三方库
import { format } from 'date-fns';
import { Table } from 'antd';

// 3. 项目内部 - 组件
import { Button } from '@/components/ui/button';
import UserCard from '@/components/UserCard';

// 4. 项目内部 - 工具/Store/Types
import { cn } from '@/lib/utils';
import { useUserStore } from '@/stores/userStore';
import type { User } from '@/types/database';

// 5. 样式和资源
import './styles.css';
```

---

## Git 提交规范

### 1. 提交消息格式

```
<type>(<scope>): <subject>

<body>

<footer>
```

### 2. Type 类型

```
feat:     新功能
fix:      修复 bug
docs:     文档更新
style:    代码格式调整（不影响功能）
refactor: 重构（既不是新功能也不是修复）
perf:     性能优化
test:     测试相关
chore:    构建工具或辅助工具变动
```

### 3. 提交示例

```bash
# 新功能
git commit -m "feat(auth): add user login functionality"

# 修复 bug
git commit -m "fix(table): resolve pagination issue"

# 文档更新
git commit -m "docs: update component usage guide"

# 样式调整
git commit -m "style(button): adjust primary button shadow"

# 重构
git commit -m "refactor(storage): simplify file upload logic"
```

---

## 错误处理规范

### 1. API 调用错误处理

```typescript
// ✅ 推荐
async function fetchUser(id: string): Promise<User | null> {
  try {
    const response = await fetch(`/api/users/${id}`);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Failed to fetch user:', error);
    return null;
  }
}
```

### 2. 表单验证

```typescript
// ✅ 推荐 - 使用 Ant Design Form 验证
<Form.Item
  name="email"
  rules={[
    { required: true, message: '请输入邮箱' },
    { type: 'email', message: '邮箱格式不正确' },
  ]}
>
  <Input placeholder="请输入邮箱" />
</Form.Item>
```

---

## 性能优化规范

### 1. 使用 React.memo 避免不必要的渲染

```typescript
// ✅ 推荐
import { memo } from 'react';

const UserCard = memo(function UserCard({ user }: { user: User }) {
  return <div>{user.name}</div>;
});
```

### 2. 使用 useMemo 和 useCallback

```typescript
// ✅ 推荐
const sortedUsers = useMemo(() => {
  return users.sort((a, b) => a.name.localeCompare(b.name));
}, [users]);

const handleClick = useCallback(() => {
  console.log('Clicked');
}, []);
```

### 3. 图片优化

```tsx
// ✅ 推荐 - 使用 Next.js Image 组件
import Image from 'next/image';

<Image
  src="/avatar.png"
  alt="User Avatar"
  width={100}
  height={100}
  priority
/>
```

---

## 安全规范

### 1. 防止 XSS 攻击

```tsx
// ✅ 推荐 - React 默认转义
<div>{userInput}</div>

// ❌ 危险 - 避免使用 dangerouslySetInnerHTML
<div dangerouslySetInnerHTML={{ __html: userInput }} />
```

### 2. 环境变量保护

```typescript
// ✅ 推荐 - 使用环境变量
const apiKey = process.env.NEXT_PUBLIC_API_KEY;

// ❌ 避免 - 硬编码敏感信息
const apiKey = 'sk_live_xxxxx';
```

---

## 参考资源

- [Next.js 官方文档](https://nextjs.org/docs)
- [React 官方文档](https://react.dev)
- [TypeScript 官方文档](https://www.typescriptlang.org/docs)
- [Tailwind CSS 文档](https://tailwindcss.com/docs)
- [Airbnb React 规范](https://github.com/airbnb/javascript/tree/master/react)
