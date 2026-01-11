interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
  animate?: boolean;
}

export function Skeleton({
  className = '',
  variant = 'rectangular',
  width,
  height,
  animate = true,
}: SkeletonProps) {
  const baseClasses = 'bg-amber-900/20';
  const animateClasses = animate ? 'animate-pulse' : '';
  const variantClasses = {
    text: 'rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-lg',
  };

  const style: React.CSSProperties = {};
  if (width) style.width = typeof width === 'number' ? `${width}px` : width;
  if (height) style.height = typeof height === 'number' ? `${height}px` : height;

  return (
    <div
      className={`${baseClasses} ${animateClasses} ${variantClasses[variant]} ${className}`}
      style={style}
    />
  );
}

export function CardSkeleton() {
  return (
    <div className="bg-stone-900/50 rounded-2xl p-5 border border-amber-900/20">
      <div className="flex items-center gap-3 mb-4">
        <Skeleton variant="circular" width={40} height={40} />
        <div className="flex-1">
          <Skeleton height={16} width="60%" className="mb-2" />
          <Skeleton height={12} width="40%" />
        </div>
      </div>
      <Skeleton height={80} className="mb-3" />
      <div className="flex gap-2">
        <Skeleton height={24} width={60} className="rounded-full" />
        <Skeleton height={24} width={60} className="rounded-full" />
      </div>
    </div>
  );
}

export function TarotCardSkeleton() {
  return (
    <div className="flex flex-col items-center">
      <Skeleton
        width={140}
        height={240}
        className="rounded-xl mb-4"
      />
      <Skeleton height={20} width={120} className="mb-2" />
      <Skeleton height={14} width={80} />
    </div>
  );
}

export function HoroscopeSkeleton() {
  return (
    <div className="bg-gradient-to-br from-stone-900 to-stone-950 rounded-2xl p-6 border border-amber-900/20">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Skeleton variant="circular" width={48} height={48} />
          <div>
            <Skeleton height={20} width={100} className="mb-2" />
            <Skeleton height={14} width={80} />
          </div>
        </div>
        <Skeleton width={60} height={28} className="rounded-full" />
      </div>
      <div className="space-y-3">
        <Skeleton height={16} width="100%" />
        <Skeleton height={16} width="95%" />
        <Skeleton height={16} width="80%" />
      </div>
      <div className="mt-4 pt-4 border-t border-amber-900/10">
        <div className="flex justify-between">
          <Skeleton height={14} width={80} />
          <Skeleton height={14} width={80} />
          <Skeleton height={14} width={80} />
        </div>
      </div>
    </div>
  );
}

export function JournalEntrySkeleton() {
  return (
    <div className="bg-stone-900/40 rounded-xl p-4 border border-amber-900/10">
      <div className="flex justify-between items-start mb-3">
        <Skeleton height={16} width={100} />
        <Skeleton height={14} width={60} />
      </div>
      <div className="space-y-2 mb-3">
        <Skeleton height={14} width="100%" />
        <Skeleton height={14} width="90%" />
        <Skeleton height={14} width="70%" />
      </div>
      <div className="flex gap-2">
        <Skeleton height={22} width={50} className="rounded-full" />
        <Skeleton height={22} width={50} className="rounded-full" />
      </div>
    </div>
  );
}

export function QuizCardSkeleton() {
  return (
    <div className="bg-stone-900/50 rounded-2xl p-5 border border-amber-900/20">
      <Skeleton height={120} className="rounded-xl mb-4" />
      <Skeleton height={20} width="70%" className="mb-2" />
      <Skeleton height={14} width="90%" className="mb-1" />
      <Skeleton height={14} width="60%" className="mb-4" />
      <Skeleton height={40} className="rounded-lg" />
    </div>
  );
}

export function ProfileSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center">
        <Skeleton variant="circular" width={96} height={96} className="mb-4" />
        <Skeleton height={24} width={150} className="mb-2" />
        <Skeleton height={16} width={100} />
      </div>
      <div className="grid grid-cols-3 gap-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-stone-900/40 rounded-xl p-4 text-center">
            <Skeleton height={28} width={40} className="mx-auto mb-2" />
            <Skeleton height={12} width={60} className="mx-auto" />
          </div>
        ))}
      </div>
      <div className="space-y-3">
        {[1, 2, 3, 4].map(i => (
          <Skeleton key={i} height={56} className="rounded-xl" />
        ))}
      </div>
    </div>
  );
}

export function ListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}

export function RitualCardSkeleton() {
  return (
    <div className="bg-gradient-to-br from-stone-900 to-stone-950 rounded-3xl p-6 border border-amber-900/30 min-h-[400px]">
      <div className="flex items-center justify-between mb-6">
        <Skeleton height={24} width={120} />
        <Skeleton variant="circular" width={32} height={32} />
      </div>
      <div className="flex flex-col items-center justify-center py-8">
        <Skeleton width={160} height={260} className="rounded-xl mb-6" />
        <Skeleton height={20} width={140} className="mb-3" />
        <Skeleton height={14} width="80%" className="mb-2" />
        <Skeleton height={14} width="60%" />
      </div>
      <div className="mt-6">
        <Skeleton height={48} className="rounded-xl" />
      </div>
    </div>
  );
}
