import React from 'react';

/** Single animated shimmer block */
export function SkeletonBlock({ className = '' }) {
  return (
    <div
      className={`bg-text-primary/5 rounded-xl animate-pulse ${className}`}
    />
  );
}

/** Skeleton for a stat card (the 4-up grid on Dashboard) */
export function StatCardSkeleton() {
  return (
    <div className="premium-card space-y-4">
      <div className="flex items-center justify-between">
        <SkeletonBlock className="w-10 h-10 rounded-xl" />
        <SkeletonBlock className="w-4 h-4 rounded" />
      </div>
      <SkeletonBlock className="h-3 w-20 rounded" />
      <SkeletonBlock className="h-7 w-12 rounded" />
      <SkeletonBlock className="h-2 w-28 rounded" />
    </div>
  );
}

/** Skeleton for a TaskRow list item */
export function TaskRowSkeleton() {
  return (
    <div className="flex items-center justify-between px-6 py-4 rounded-xl border border-border-subtle gap-4">
      <div className="flex items-center gap-4 flex-1 min-w-0">
        <SkeletonBlock className="w-9 h-9 rounded-full shrink-0" />
        <div className="flex-1 space-y-2">
          <SkeletonBlock className="h-4 w-3/4 rounded" />
          <SkeletonBlock className="h-3 w-1/3 rounded" />
        </div>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <SkeletonBlock className="h-6 w-20 rounded-lg" />
        <SkeletonBlock className="h-8 w-8 rounded-lg" />
      </div>
    </div>
  );
}

/** Skeleton for a TaskMarketCard */
export function TaskMarketCardSkeleton() {
  return (
    <div className="premium-card flex flex-col h-full space-y-4">
      <div className="flex gap-2">
        <SkeletonBlock className="h-5 w-16 rounded" />
        <SkeletonBlock className="h-5 w-20 rounded" />
      </div>
      <SkeletonBlock className="h-5 w-3/4 rounded" />
      <SkeletonBlock className="h-3 w-full rounded" />
      <SkeletonBlock className="h-3 w-5/6 rounded" />
      <div className="flex items-center justify-between pt-4 border-t border-border-subtle mt-auto">
        <div className="flex items-center gap-2.5">
          <SkeletonBlock className="w-8 h-8 rounded-full" />
          <div className="space-y-1">
            <SkeletonBlock className="h-3 w-24 rounded" />
            <SkeletonBlock className="h-2 w-16 rounded" />
          </div>
        </div>
        <SkeletonBlock className="h-8 w-20 rounded-lg" />
      </div>
    </div>
  );
}

/** Skeleton for the full TaskDetail page content (inside the layout) */
export function TaskDetailSkeleton() {
  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-10 animate-pulse">
      {/* Back link */}
      <SkeletonBlock className="h-4 w-32 rounded" />

      {/* Title + badges */}
      <div className="space-y-4">
        <SkeletonBlock className="h-9 w-2/3 rounded-xl" />
        <div className="flex gap-2">
          <SkeletonBlock className="h-6 w-24 rounded-full" />
          <SkeletonBlock className="h-6 w-28 rounded-full" />
          <SkeletonBlock className="h-6 w-20 rounded-full" />
        </div>
      </div>

      {/* Glass panel */}
      <div className="premium-card">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="space-y-3">
              <SkeletonBlock className="h-3 w-20 rounded" />
              <SkeletonBlock className="h-5 w-40 rounded" />
            </div>
          ))}
        </div>
      </div>

      {/* Timeline */}
      <div className="space-y-4">
        <SkeletonBlock className="h-5 w-36 rounded" />
        <div className="flex justify-between gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-2 flex-1">
              <SkeletonBlock className="w-4 h-4 rounded-full" />
              <SkeletonBlock className="h-3 w-16 rounded" />
            </div>
          ))}
        </div>
      </div>

      {/* Milestones */}
      <div className="premium-card space-y-4">
        <SkeletonBlock className="h-5 w-28 rounded" />
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex items-center justify-between p-4 rounded-xl border border-border-subtle">
            <div className="flex items-center gap-4">
              <SkeletonBlock className="w-10 h-10 rounded-lg" />
              <div className="space-y-2">
                <SkeletonBlock className="h-4 w-40 rounded" />
                <SkeletonBlock className="h-3 w-20 rounded" />
              </div>
            </div>
            <SkeletonBlock className="h-8 w-20 rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  );
}
