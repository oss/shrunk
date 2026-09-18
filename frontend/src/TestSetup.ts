import '@testing-library/jest-dom';

// Guard against a known Radix FocusScope + jsdom interaction bug: jsdom
// runs focus()/focusout handling synchronously, and Radix's focus-trap
// "return focus to the last element" behavior calls .focus() from inside
// its own focusout handler, so the two recurse into each other forever
// and blow the call stack (surfaces as a hung test whenever a Radix
// Dialog/AlertDialog/Popover opens or closes). Cap the recursion depth
// rather than disabling focus() outright, so real focus assertions still
// work for the normal (non-recursive) case.
if (typeof HTMLElement !== 'undefined') {
  const originalFocus = HTMLElement.prototype.focus;
  let focusDepth = 0;
  HTMLElement.prototype.focus = function focus(
    ...args: Parameters<typeof originalFocus>
  ) {
    if (focusDepth > 20) return;
    focusDepth += 1;
    try {
      originalFocus.apply(this, args);
    } finally {
      focusDepth -= 1;
    }
  };
}
