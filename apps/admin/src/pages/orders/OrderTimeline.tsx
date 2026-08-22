import { Check } from 'lucide-react';
import type { OrderStatus } from '@textile-admin/shared';
import { cn } from '@/lib/utils';

const HAPPY_PATH: OrderStatus[] = ['PENDING', 'CONFIRMED', 'PACKED', 'SHIPPED', 'DELIVERED'];

export function OrderTimeline({ status }: { status: OrderStatus }) {
  if (status === 'CANCELLED' || status === 'RETURNED') {
    return (
      <div className="rounded-md border border-dashed p-3 text-center text-sm text-muted-foreground">
        This order was {status === 'CANCELLED' ? 'cancelled' : 'returned'}.
      </div>
    );
  }

  const currentIndex = HAPPY_PATH.indexOf(status);

  return (
    <div className="flex items-center">
      {HAPPY_PATH.map((step, i) => {
        const done = i < currentIndex;
        const active = i === currentIndex;
        return (
          <div key={step} className="flex flex-1 items-center last:flex-none">
            <div className="flex flex-col items-center gap-1">
              <div
                className={cn(
                  'flex h-7 w-7 items-center justify-center rounded-full border-2 text-xs font-medium',
                  done && 'border-primary bg-primary text-primary-foreground',
                  active && 'border-primary text-primary',
                  !done && !active && 'border-muted-foreground/30 text-muted-foreground',
                )}
              >
                {done ? <Check className="h-3.5 w-3.5" /> : i + 1}
              </div>
              <span className={cn('text-xs', active ? 'font-medium text-foreground' : 'text-muted-foreground')}>
                {step}
              </span>
            </div>
            {i < HAPPY_PATH.length - 1 && (
              <div className={cn('mx-1 h-0.5 flex-1', done ? 'bg-primary' : 'bg-muted-foreground/20')} />
            )}
          </div>
        );
      })}
    </div>
  );
}
