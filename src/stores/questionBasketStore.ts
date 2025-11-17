import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

/**
 * 题目接口（简化版）
 */
interface Question {
  id: string;
  content: string;
  type: 'choice' | 'fill' | 'essay' | 'answer';
  difficulty: 'easy' | 'medium' | 'hard';
  subject_id?: number;
  grade_id?: number;
  knowledge_points?: string[];
}

/**
 * 题篮状态接口
 */
interface QuestionBasketState {
  questions: Question[];
  selectedQuestionIds: Set<string>;

  // Actions
  addQuestion: (question: Question) => void;
  removeQuestion: (questionId: string) => void;
  clearBasket: () => void;
  toggleSelection: (questionId: string) => void;
  selectAll: () => void;
  deselectAll: () => void;
  reorderQuestions: (sourceId: string, targetId: string) => void;

  // Getters
  getQuestionCount: () => number;
  getSelectedCount: () => number;
  hasQuestion: (questionId: string) => boolean;
}

/**
 * 题篮状态管理 Store
 *
 * 用途: 教师选题时临时存储题目，用于组卷
 *
 * 特性:
 * - ✅ 持久化到 localStorage
 * - ✅ 支持批量选择
 * - ✅ 支持题目计数
 */
export const useQuestionBasketStore = create<QuestionBasketState>()(
  devtools(
    persist(
      (set, get) => ({
        questions: [],
        selectedQuestionIds: new Set<string>(),

        addQuestion: (question) =>
          set(
            (state) => {
              // 避免重复添加
              if (state.questions.some((q) => q.id === question.id)) {
                return state;
              }
              return {
                questions: [...state.questions, question],
              };
            },
            false,
            'basket/addQuestion'
          ),

        removeQuestion: (questionId) =>
          set(
            (state) => ({
              questions: state.questions.filter((q) => q.id !== questionId),
              selectedQuestionIds: new Set(
                [...state.selectedQuestionIds].filter((id) => id !== questionId)
              ),
            }),
            false,
            'basket/removeQuestion'
          ),

        clearBasket: () =>
          set(
            {
              questions: [],
              selectedQuestionIds: new Set<string>(),
            },
            false,
            'basket/clearBasket'
          ),

      toggleSelection: (questionId) =>
        set(
          (state) => {
            const newSelection = new Set(state.selectedQuestionIds);
            if (newSelection.has(questionId)) {
              newSelection.delete(questionId);
            } else {
              newSelection.add(questionId);
            }
            return { selectedQuestionIds: newSelection };
          },
          false,
          'basket/toggleSelection'
        ),

      reorderQuestions: (sourceId, targetId) =>
        set(
          (state) => {
            const list = [...state.questions];
            const fromIndex = list.findIndex((q) => q.id === sourceId);
            const toIndex = list.findIndex((q) => q.id === targetId);
            if (fromIndex === -1 || toIndex === -1) return state;
            const [moved] = list.splice(fromIndex, 1);
            list.splice(toIndex, 0, moved);
            return { questions: list };
          },
          false,
          'basket/reorderQuestions'
        ),

        selectAll: () =>
          set(
            (state) => ({
              selectedQuestionIds: new Set(state.questions.map((q) => q.id)),
            }),
            false,
            'basket/selectAll'
          ),

        deselectAll: () =>
          set(
            {
              selectedQuestionIds: new Set<string>(),
            },
            false,
            'basket/deselectAll'
          ),

        // Getters
        getQuestionCount: () => get().questions.length,
        getSelectedCount: () => get().selectedQuestionIds.size,
        hasQuestion: (questionId) =>
          get().questions.some((q) => q.id === questionId),
      }),
      {
        name: 'question-basket-storage',
        // 自定义序列化 Set
        partialize: (state) => ({
          questions: state.questions,
          selectedQuestionIds: [...state.selectedQuestionIds],
        }),
        // @ts-ignore
        merge: (persistedState, currentState) => {
          const persisted = persistedState as any;
          return {
            ...currentState,
            questions: persisted.questions || [],
            selectedQuestionIds: new Set(persisted.selectedQuestionIds || []),
          };
        },
      }
    ),
    {
      name: 'QuestionBasketStore',
    }
  )
);

/**
 * 使用示例:
 *
 * ```tsx
 * import { useQuestionBasketStore } from '@/stores/questionBasketStore';
 *
 * function QuestionList() {
 *   const addQuestion = useQuestionBasketStore((state) => state.addQuestion);
 *   const questionCount = useQuestionBasketStore((state) => state.getQuestionCount());
 *
 *   return (
 *     <div>
 *       <p>题篮: {questionCount} 道题</p>
 *       <Button onClick={() => addQuestion(question)}>
 *         加入题篮
 *       </Button>
 *     </div>
 *   );
 * }
 * ```
 */
