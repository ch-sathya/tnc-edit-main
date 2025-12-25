import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

// Animated code-style skeleton bars
const CodeBars = ({ count = 5, className = '' }: { count?: number; className?: string }) => (
  <div className={`flex gap-1 items-end ${className}`}>
    {Array.from({ length: count }).map((_, i) => (
      <div
        key={i}
        className="w-1.5 bg-emerald-500/70 rounded-sm animate-pulse"
        style={{
          height: `${Math.random() * 16 + 8}px`,
          animationDelay: `${i * 0.1}s`,
          animationDuration: '0.8s',
        }}
      />
    ))}
  </div>
);

// Profile skeleton with code-style loading
export const ProfileSkeleton = () => (
  <Card className="mb-8 overflow-hidden">
    <CardContent className="pt-6">
      <div className="flex flex-col md:flex-row gap-6">
        <div className="relative">
          <Skeleton className="h-32 w-32 rounded-full" />
          <div className="absolute bottom-0 right-0">
            <CodeBars count={3} />
          </div>
        </div>
        <div className="flex-1 space-y-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-8 w-48" />
            <CodeBars count={4} />
          </div>
          <Skeleton className="h-4 w-32" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-9 w-24" />
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
);

// Stats grid skeleton
export const StatsSkeleton = ({ count = 4 }: { count?: number }) => (
  <div className={`grid grid-cols-1 md:grid-cols-${count} gap-4 mb-8`}>
    {Array.from({ length: count }).map((_, i) => (
      <Card key={i} className="overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-4 rounded" />
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <Skeleton className="h-8 w-12" />
            <CodeBars count={3} />
          </div>
        </CardContent>
      </Card>
    ))}
  </div>
);

// Project card skeleton
export const ProjectCardSkeleton = () => (
  <Card className="overflow-hidden">
    <Skeleton className="h-40 w-full" />
    <CardContent className="pt-4 space-y-3">
      <div className="flex items-center justify-between">
        <Skeleton className="h-6 w-3/4" />
        <CodeBars count={2} />
      </div>
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-2/3" />
      <div className="flex gap-2 pt-2">
        <Skeleton className="h-6 w-16 rounded-full" />
        <Skeleton className="h-6 w-16 rounded-full" />
        <Skeleton className="h-6 w-16 rounded-full" />
      </div>
    </CardContent>
  </Card>
);

// Repository card skeleton
export const RepoCardSkeleton = () => (
  <Card className="overflow-hidden">
    <CardContent className="pt-4 space-y-3">
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-1/2" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-8" />
          <CodeBars count={2} />
        </div>
      </div>
      <Skeleton className="h-4 w-full" />
      <div className="flex gap-2 pt-2">
        <Skeleton className="h-5 w-14 rounded-full" />
        <Skeleton className="h-5 w-14 rounded-full" />
      </div>
    </CardContent>
  </Card>
);

// Full portfolio page skeleton
export const PortfolioPageSkeleton = () => (
  <div className="container mx-auto py-8 px-4 max-w-7xl">
    <ProfileSkeleton />
    <StatsSkeleton count={4} />
    <div className="space-y-6">
      <Skeleton className="h-10 w-full max-w-md" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[1, 2, 3, 4].map(i => (
          <ProjectCardSkeleton key={i} />
        ))}
      </div>
    </div>
  </div>
);

// User profile page skeleton
export const UserProfilePageSkeleton = () => (
  <div className="container mx-auto py-8 px-4 max-w-5xl">
    <ProfileSkeleton />
    <StatsSkeleton count={3} />
    <div className="space-y-6">
      <Skeleton className="h-10 w-full max-w-sm" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[1, 2].map(i => (
          <ProjectCardSkeleton key={i} />
        ))}
      </div>
    </div>
  </div>
);

// Connection card skeleton
export const ConnectionCardSkeleton = () => (
  <Card className="overflow-hidden">
    <CardContent className="pt-4">
      <div className="flex items-center gap-4">
        <Skeleton className="h-12 w-12 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-24" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-20" />
          <Skeleton className="h-9 w-20" />
        </div>
      </div>
    </CardContent>
  </Card>
);
