import React from 'react';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
  circle?: boolean;
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = '16px',
  borderRadius,
  circle = false,
  className = '',
  style,
  ...props
}) => {
  const actualRadius = circle ? '50%' : (borderRadius || '6px');

  return (
    <div
      className={`crm-skeleton ${className}`}
      style={{
        width: circle ? height : width,
        height,
        borderRadius: actualRadius,
        backgroundColor: 'var(--skeleton-bg, rgba(148, 163, 184, 0.15))',
        background: 'linear-gradient(90deg, var(--skeleton-bg, rgba(148, 163, 184, 0.15)) 25%, var(--skeleton-shimmer, rgba(148, 163, 184, 0.28)) 50%, var(--skeleton-bg, rgba(148, 163, 184, 0.15)) 75%)',
        backgroundSize: '200% 100%',
        animation: 'skeletonShimmer 1.5s infinite ease-in-out',
        display: 'inline-block',
        ...style
      }}
      {...props}
    />
  );
};
