export const modalContentMotionProps = {
  initial: { scale: 0 },
  variants: {
    open: { scale: 1 },
    closed: { scale: 0 },
  },
} as const;

export const modalOverlayMotionProps = {
  initial: { opacity: 0 },
  variants: {
    open: { opacity: 1 },
    closed: { opacity: 0 },
  },
} as const;
