export function PostCardSkeleton() {
  return (
    <div className="bg-surface border border-line/80 rounded-xl p-5 shadow-sm space-y-4 animate-shimmer">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-24 h-5 bg-surface-muted rounded-full"></div>
          <div className="w-16 h-5 bg-surface-muted rounded-full"></div>
        </div>
        <div className="w-16 h-5 bg-surface-muted rounded-full"></div>
      </div>
      <div className="space-y-2">
        <div className="w-5/6 h-5 bg-surface-muted rounded-lg"></div>
        <div className="w-2/3 h-5 bg-surface-muted rounded-lg"></div>
      </div>
      <div className="space-y-1.5">
        <div className="w-full h-3 bg-surface-muted rounded"></div>
        <div className="w-4/5 h-3 bg-surface-muted rounded"></div>
      </div>
      <div className="flex gap-2">
        <div className="w-28 h-6 bg-surface-muted rounded-lg"></div>
        <div className="w-24 h-6 bg-surface-muted rounded-lg"></div>
      </div>
      <div className="pt-3 border-t border-line flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-surface-muted"></div>
          <div className="space-y-1">
            <div className="w-20 h-3 bg-surface-muted rounded"></div>
            <div className="w-16 h-2 bg-surface-muted rounded"></div>
          </div>
        </div>
        <div className="w-20 h-4 bg-surface-muted rounded"></div>
      </div>
    </div>
  );
}

export function PostDetailSkeleton() {
  return (
    <div className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6 animate-shimmer">
      <div className="lg:col-span-2 bg-surface border border-line/80 rounded-xl p-6 sm:p-8 space-y-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="w-28 h-6 bg-surface-muted rounded-full"></div>
          <div className="w-20 h-6 bg-surface-muted rounded-full"></div>
        </div>
        <div className="w-4/5 h-8 bg-surface-muted rounded-xl"></div>
        <div className="w-full h-48 bg-surface-muted rounded-xl"></div>
        <div className="space-y-2 pt-2">
          <div className="w-full h-4 bg-surface-muted rounded"></div>
          <div className="w-11/12 h-4 bg-surface-muted rounded"></div>
          <div className="w-3/4 h-4 bg-surface-muted rounded"></div>
        </div>
        <div className="flex gap-2 pt-4">
          <div className="w-24 h-7 bg-surface-muted rounded-lg"></div>
          <div className="w-28 h-7 bg-surface-muted rounded-lg"></div>
        </div>
      </div>
      <div className="bg-surface border border-line/80 rounded-xl p-6 space-y-4 shadow-sm h-fit">
        <div className="w-28 h-5 bg-surface-muted rounded"></div>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-surface-muted rounded-full"></div>
          <div className="space-y-1.5 flex-1">
            <div className="w-24 h-4 bg-surface-muted rounded"></div>
            <div className="w-32 h-3 bg-surface-muted rounded"></div>
          </div>
        </div>
        <div className="w-full h-24 bg-surface-muted rounded-xl"></div>
        <div className="w-full h-10 bg-surface-muted rounded-xl"></div>
      </div>
    </div>
  );
}

export function InboxItemSkeleton() {
  return (
    <div className="bg-surface border border-line/80 rounded-xl p-5 shadow-sm space-y-3 animate-shimmer">
      <div className="flex items-center justify-between">
        <div className="w-48 h-5 bg-surface-muted rounded-lg"></div>
        <div className="w-16 h-5 bg-surface-muted rounded-full"></div>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-full bg-surface-muted"></div>
        <div className="w-36 h-3 bg-surface-muted rounded"></div>
      </div>
      <div className="w-full h-12 bg-surface-muted rounded-xl"></div>
      <div className="flex gap-2 pt-1">
        <div className="w-20 h-7 bg-surface-muted rounded-lg"></div>
        <div className="w-20 h-7 bg-surface-muted rounded-lg"></div>
      </div>
    </div>
  );
}

export function MessageSkeleton() {
  return (
    <div className="space-y-4 animate-shimmer p-4">
      <div className="flex items-start gap-2 max-w-[70%]">
        <div className="w-7 h-7 rounded-full bg-surface-muted shrink-0"></div>
        <div className="w-48 h-12 bg-surface-muted rounded-xl rounded-tl-sm"></div>
      </div>
      <div className="flex items-end justify-end gap-2">
        <div className="w-56 h-14 bg-brand-soft rounded-xl rounded-tr-sm"></div>
      </div>
      <div className="flex items-start gap-2 max-w-[70%]">
        <div className="w-7 h-7 rounded-full bg-surface-muted shrink-0"></div>
        <div className="w-36 h-10 bg-surface-muted rounded-xl rounded-tl-sm"></div>
      </div>
    </div>
  );
}

