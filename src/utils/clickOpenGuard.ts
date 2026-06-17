import type { KeyboardEvent, MouseEvent } from 'react';

const INTERACTIVE_SELECTOR = [
  'a',
  'button',
  'input',
  'textarea',
  'select',
  'label',
  '[role="button"]',
  '[role="link"]',
  '[contenteditable="true"]',
  '[data-ignore-open="true"]',
].join(',');

function hasInteractiveTarget(event: MouseEvent<HTMLElement> | KeyboardEvent<HTMLElement>) {
  const target = event.target instanceof Element ? event.target : null;
  const currentTarget = event.currentTarget instanceof Element ? event.currentTarget : null;
  if (!target || !currentTarget || target === currentTarget) return false;

  const interactive = target.closest(INTERACTIVE_SELECTOR);
  return !!interactive && interactive !== currentTarget && currentTarget.contains(interactive);
}

function hasTextSelectionInside(root: Element) {
  const selection = window.getSelection?.();
  if (!selection || selection.isCollapsed || !selection.toString().trim()) return false;

  const { anchorNode, focusNode } = selection;
  return (!!anchorNode && root.contains(anchorNode)) || (!!focusNode && root.contains(focusNode));
}

export function shouldIgnoreOpenClick(event: MouseEvent<HTMLElement>) {
  if (event.defaultPrevented || event.button !== 0) return true;
  if (hasInteractiveTarget(event)) return true;
  return hasTextSelectionInside(event.currentTarget);
}

export function openOnActivationKey(event: KeyboardEvent<HTMLElement>, open: () => void) {
  if (event.key !== 'Enter' && event.key !== ' ') return;
  if (event.defaultPrevented || hasInteractiveTarget(event)) return;

  event.preventDefault();
  open();
}
