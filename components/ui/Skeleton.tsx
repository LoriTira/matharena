'use client';

interface SkeletonProps {
  width?: string;
  height?: string;
  className?: string;
}

export function Skeleton({ width, height, className = '' }: SkeletonProps) {
  return (
    <div
      className={`relative overflow-hidden rounded-sm bg-shade ${className}`}
      style={{ width, height }}
    >
      <div className="absolute inset-0 animate-shimmer bg-gradient-to-r from-transparent via-shade to-transparent" />
    </div>
  );
}
