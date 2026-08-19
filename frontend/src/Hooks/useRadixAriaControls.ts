import { useEffect, useRef } from 'react';

export function useRadixAriaControls<T extends HTMLElement>(
  forwardedRef: React.ForwardedRef<T>,
  removeWhileOpen = false,
) {
  const triggerRef = useRef<T | null>(null);

  useEffect(() => {
    const trigger = triggerRef.current;
    if (!trigger || typeof MutationObserver === 'undefined') return;

    const removeStaleControls = () => {
      if (
        removeWhileOpen ||
        trigger.getAttribute('aria-expanded') === 'false'
      ) {
        trigger.removeAttribute('aria-controls');
      }
    };

    removeStaleControls();
    const observer = new MutationObserver(removeStaleControls);
    observer.observe(trigger, {
      attributes: true,
      attributeFilter: ['aria-controls', 'aria-expanded'],
    });
    return () => observer.disconnect();
  }, [removeWhileOpen]);

  return (node: T | null) => {
    triggerRef.current = node;
    if (typeof forwardedRef === 'function') forwardedRef(node);
    else if (forwardedRef) forwardedRef.current = node;
  };
}
