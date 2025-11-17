import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

/**
 * 用户信息类型
 */
interface User {
  id: string;
  email: string;
  role: 'teacher' | 'student';
  name?: string;
  avatar?: string;
}

/**
 * 用户状态接口
 */
interface UserState {
  user: User | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  logout: () => void;
}

/**
 * 用户状态管理 Store
 *
 * 特性:
 * - ✅ 持久化到 localStorage
 * - ✅ Redux DevTools 调试支持
 * - ✅ TypeScript 类型安全
 */
export const useUserStore = create<UserState>()(
  devtools(
    persist(
      (set) => ({
        user: null,
        isLoading: false,
        error: null,

        setUser: (user) =>
          set(
            { user, error: null },
            false,
            'user/setUser'
          ),

        setLoading: (loading) =>
          set(
            { isLoading: loading },
            false,
            'user/setLoading'
          ),

        setError: (error) =>
          set(
            { error, isLoading: false },
            false,
            'user/setError'
          ),

        logout: () =>
          set(
            { user: null, error: null },
            false,
            'user/logout'
          ),
      }),
      {
        name: 'user-storage', // localStorage key
      }
    ),
    {
      name: 'UserStore', // DevTools 名称
    }
  )
);

/**
 * 使用示例:
 *
 * ```tsx
 * import { useUserStore } from '@/stores/userStore';
 *
 * function ProfilePage() {
 *   const user = useUserStore((state) => state.user);
 *   const setUser = useUserStore((state) => state.setUser);
 *
 *   return <div>{user?.name}</div>;
 * }
 * ```
 */
