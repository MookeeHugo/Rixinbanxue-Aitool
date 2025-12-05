import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { ParseTask, ParsedQuestionItem, TaskStage } from "@/types/tasks"

interface AppState {
  currentTask: ParseTask | null
  taskHistory: ParseTask[]
  questions: ParsedQuestionItem[]

  setQuestions: (questions: ParsedQuestionItem[] | ((prev: ParsedQuestionItem[]) => ParsedQuestionItem[])) => void
  setCurrentTask: (task: ParseTask | null) => void
  addTaskToHistory: (task: ParseTask) => void
  updateTaskProgress: (
    taskId: string,
    progress: number,
    status: ParseTask["status"],
    questions?: ParsedQuestionItem[],
  ) => void
  clearCurrentTask: () => void
  addIngestTask: (task: ParseTask) => void
  setCurrentIngestTask: (task: ParseTask | null) => void

  updateTaskStage: (taskId: string, stage: TaskStage) => void
  getIncompleteTask: () => ParseTask | null
  dismissIncompleteTask: () => void
  clearIncompleteTask: () => void // Add clearIncompleteTask to interface
  completeTask: (taskId: string) => void
  restoreIncompleteTask: () => void // Add method to restore dismissed task

  usedStorage: number
  updateUsedStorage: (delta: number) => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      currentTask: null,
      taskHistory: [],
      questions: [],

      setQuestions: (questions) =>
        set((state) => ({
          questions: typeof questions === "function" ? questions(state.questions) : questions,
        })),

      setCurrentTask: (task) => {
        console.log("[v0] Store setCurrentTask called:", task)
        set({
          currentTask: task
            ? {
                ...task,
                stage: task.stage ?? "uploading",
                lastActiveAt: Date.now(),
                isIncomplete: task.stage !== "completed",
              }
            : null,
        })
      },

      addTaskToHistory: (task) =>
        set((state) => ({
          taskHistory: [task, ...state.taskHistory.slice(0, 9)],
        })),

      updateTaskProgress: (taskId, progress, status, questions) =>
        set((state) => {
          if (state.currentTask?.taskId === taskId) {
            const updatedTask = {
              ...state.currentTask,
              progress,
              status,
              questions,
              lastActiveAt: Date.now(),
              stage: status === "completed" ? ("completed" as TaskStage) : state.currentTask.stage,
              isIncomplete: status !== "completed",
            }
            console.log("[v0] Store updateTaskProgress:", updatedTask)
            return {
              currentTask: updatedTask,
            }
          }
          return state
        }),

      clearCurrentTask: () => set({ currentTask: null }),

      addIngestTask: (task) =>
        set((state) => ({
          taskHistory: [task, ...state.taskHistory.slice(0, 9)],
          currentTask: {
            ...task,
            stage: task.stage ?? "parsing",
            lastActiveAt: Date.now(),
            isIncomplete: true,
          },
        })),

      setCurrentIngestTask: (task) =>
        set({
          currentTask: task
            ? {
                ...task,
                stage: task.stage ?? "uploading",
                lastActiveAt: Date.now(),
                isIncomplete: task.stage !== "completed",
              }
            : null,
        }),

      updateTaskStage: (taskId, stage) =>
        set((state) => {
          if (state.currentTask?.taskId === taskId) {
            return {
              currentTask: {
                ...state.currentTask,
                stage,
                lastActiveAt: Date.now(),
                isIncomplete: stage !== "completed",
              },
            }
          }
          return state
        }),

      getIncompleteTask: () => {
        const task = get().currentTask
        if (task && task.isIncomplete && task.stage !== "completed") {
          return task
        }
        return null
      },

      dismissIncompleteTask: () =>
        set((state) => {
          if (state.currentTask) {
            return {
              currentTask: {
                ...state.currentTask,
                isIncomplete: true,
                isDismissed: true,
              },
            }
          }
          return state
        }),

      restoreIncompleteTask: () =>
        set((state) => {
          if (state.currentTask) {
            return {
              currentTask: {
                ...state.currentTask,
                isDismissed: false,
              },
            }
          }
          return state
        }),

      clearIncompleteTask: () => set({ currentTask: null }),

      completeTask: (taskId) =>
        set((state) => {
          if (state.currentTask?.taskId === taskId) {
            return {
              currentTask: {
                ...state.currentTask,
                stage: "completed" as TaskStage,
                isIncomplete: false,
                status: "completed",
              },
            }
          }
          return state
        }),

      usedStorage: 0,

      updateUsedStorage: (delta) =>
        set((state) => ({
          usedStorage: Math.max(0, state.usedStorage + delta),
        })),
    }),
    {
      name: "app-storage",
      partialize: (state) => ({
        taskHistory: state.taskHistory,
        usedStorage: state.usedStorage,
        currentTask: state.currentTask,
        questions: state.questions,
      }),
    },
  ),
)
