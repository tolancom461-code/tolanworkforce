/**
 * ComponentShowcaseWrapper
 * 
 * This component serves as a wrapper for the large ComponentShowcase page.
 * It provides lazy loading and code splitting capabilities to improve performance.
 * 
 * The actual showcase is still in pages/ComponentShowcase.tsx but this wrapper
 * allows for future refactoring into smaller, more manageable components.
 */

import React, { Suspense, lazy } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

const ComponentShowcase = lazy(() => import('@/pages/ComponentShowcase'));

export const ComponentShowcaseWrapper: React.FC = () => {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background text-foreground p-4">
          <div className="container max-w-6xl mx-auto space-y-4">
            <Skeleton className="h-12 w-1/3" />
            <Skeleton className="h-8 w-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          </div>
        </div>
      }
    >
      <ComponentShowcase />
    </Suspense>
  );
};

export default ComponentShowcaseWrapper;
