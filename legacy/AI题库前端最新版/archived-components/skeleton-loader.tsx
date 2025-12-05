import { Skeleton } from "@/components/ui/skeleton"
import { Card } from "@/components/ui/card"

export function SkeletonLoader({ type = "card", count = 1 }: { type?: "card" | "list" | "progress"; count?: number }) {
  if (type === "list") {
    return <QuestionListSkeleton count={count} />
  }
  if (type === "progress") {
    return <ParsingProgressSkeleton />
  }
  return <QuestionListSkeleton count={count} />
}

export function QuestionCardSkeleton() {
  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-6 w-16" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-4/6" />
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-8 w-20" />
      </div>
    </Card>
  )
}

export function QuestionListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <QuestionCardSkeleton key={i} />
      ))}
    </div>
  )
}

export function ParsingProgressSkeleton() {
  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-6 w-12" />
      </div>
      <Skeleton className="h-2 w-full" />
      <div className="flex gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex-1 space-y-2">
            <Skeleton className="h-10 w-10 rounded-full mx-auto" />
            <Skeleton className="h-3 w-full" />
          </div>
        ))}
      </div>
    </Card>
  )
}
