import * as React from 'react';
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
} from 'lucide-react';
import { DayPicker } from 'react-day-picker';

import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  components,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn('bg-popover p-3 text-popover-foreground', className)}
      classNames={{
        root: 'w-fit',
        months: 'flex flex-col gap-4 sm:flex-row',
        month: 'space-y-4',
        month_caption:
          'flex justify-center bg-popover pt-1 text-sm font-medium text-popover-foreground',
        caption_label: 'bg-popover text-sm font-medium text-popover-foreground',
        nav: 'absolute inset-x-3 top-3 flex items-center justify-between',
        button_previous: cn(
          buttonVariants({ variant: 'outline' }),
          'h-7 w-7 bg-transparent p-0 text-popover-foreground opacity-100 hover:opacity-100',
        ),
        button_next: cn(
          buttonVariants({ variant: 'outline' }),
          'h-7 w-7 bg-transparent p-0 text-popover-foreground opacity-100 hover:opacity-100',
        ),
        month_grid: 'w-full border-collapse space-y-1',
        weekdays: 'flex',
        weekday:
          'w-8 rounded-md text-[0.8rem] font-normal text-popover-foreground',
        week: 'mt-2 flex w-full',
        day: 'relative h-8 w-8 p-0 text-center text-sm',
        day_button: cn(
          buttonVariants({ variant: 'ghost' }),
          'h-8 w-8 p-0 font-normal text-popover-foreground aria-selected:opacity-100',
        ),
        selected:
          '[&_button]:bg-primary [&_button]:text-primary-foreground [&_button]:hover:bg-primary [&_button]:hover:text-primary-foreground [&_button]:focus:bg-primary [&_button]:focus:text-primary-foreground',
        today: '[&_button]:bg-accent [&_button]:text-accent-foreground',
        outside: 'text-popover-foreground [&_button]:text-popover-foreground',
        disabled: 'text-popover-foreground [&_button]:text-popover-foreground',
        hidden: 'invisible',
        ...classNames,
      }}
      components={{
        CaptionLabel: ({ className, children }) => (
          <span aria-hidden="true" className={cn(className, 'sr-only')}>
            {children}
          </span>
        ),
        Chevron: ({ orientation, className, ...chevronProps }) => {
          const Icon =
            orientation === 'left'
              ? ChevronLeft
              : orientation === 'right'
                ? ChevronRight
                : orientation === 'up'
                  ? ChevronUp
                  : ChevronDown;

          return (
            <Icon className={cn('h-4 w-4', className)} {...chevronProps} />
          );
        },
        ...components,
      }}
      {...props}
    />
  );
}
Calendar.displayName = 'Calendar';

export { Calendar };
