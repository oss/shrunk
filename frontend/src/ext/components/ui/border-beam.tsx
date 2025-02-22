import React, { ComponentPropsWithoutRef } from 'react';
import { cn } from '@/src/lib/utils';

interface BorderBeamProps extends ComponentPropsWithoutRef<'div'> {
  size?: number;
  duration?: number;
  borderWidth?: number;
  anchor?: number;
  colorFrom?: string;
  colorTo?: string;
  delay?: number;
}

export const BorderBeam = ({
  className,
  size = 200,
  duration = 15,
  anchor = 90,
  borderWidth = 1.5,
  colorFrom = '#ffaa40',
  colorTo = '#9c40ff',
  delay = 0,
  ...props
}: BorderBeamProps) => (
  <div
    style={
      {
        '--size': size,
        '--duration': duration,
        '--anchor': anchor,
        '--border-width': borderWidth,
        '--color-from': colorFrom,
        '--color-to': colorTo,
        '--delay': `-${delay}s`,
      } as React.CSSProperties
    }
    className={cn(
      'tw-pointer-events-none tw-absolute tw-inset-0 tw-rounded-[inherit] tw-[border:calc(var(--border-width)*1px)_solid_transparent]',

      // mask styles
      'tw-![mask-clip:padding-box,border-box] tw-![mask-composite:intersect] tw-[mask:linear-gradient(transparent,transparent),linear-gradient(white,white)]',

      // pseudo styles
      'tw-after:absolute tw-after:aspect-square tw-after:w-[calc(var(--size)*1px)] tw-after:animate-border-beam tw-after:[animation-delay:var(--delay)] tw-after:[background:linear-gradient(to_left,var(--color-from),var(--color-to),transparent)] tw-after:[offset-anchor:calc(var(--anchor)*1%)_50%] tw-after:[offset-path:rect(0_auto_auto_0_round_calc(var(--size)*1px))]',
      className,
    )}
    {...props}
  />
);
