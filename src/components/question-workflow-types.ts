export type WorkflowQuestionType = 'choice' | 'fill' | 'solve'

export interface WorkflowTag {
  category: string
  value: string
  id?: string
}

export interface WorkflowQuestion {
  id: string
  type: WorkflowQuestionType
  content: string
  options?: string[]
  answer: string
  tags: WorkflowTag[]
  image?: string
}
