import * as React from 'react';
import { cn } from '@/lib/utils';

function Skeleton({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="skeleton" className={cn('animate-shimmer rounded-md bg-accent bg-[linear-gradient(90deg,transparent_0%,rgb(255_255_255/0.65)_50%,transparent_100%)] bg-[length:200%_100%]', className)} {...props} />;
}

export { Skeleton };
