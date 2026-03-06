import { useEffect, useCallback, useRef } from 'react';

export interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  action: () => void;
  description: string;
  category?: string;
  preventDefault?: boolean;
  allowInInput?: boolean;
}

interface UseKeyboardShortcutsOptions {
  enabled?: boolean;
}

/**
 * Register keyboard shortcuts with modifier key support.
 * Automatically skips shortcuts when user is typing in input fields
 * (unless allowInInput is set).
 */
export function useKeyboardShortcuts(
  shortcuts: KeyboardShortcut[],
  options: UseKeyboardShortcutsOptions = {}
): KeyboardShortcut[] {
  const { enabled = true } = options;
  const shortcutsRef = useRef(shortcuts);

  useEffect(() => {
    shortcutsRef.current = shortcuts;
  }, [shortcuts]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      const target = event.target as HTMLElement;
      const isInputField =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        target.isContentEditable;

      for (const shortcut of shortcutsRef.current) {
        if (isInputField && !shortcut.allowInInput) continue;

        const keyMatch =
          event.key.toLowerCase() === shortcut.key.toLowerCase() ||
          event.code.toLowerCase() === `key${shortcut.key.toLowerCase()}`;

        const ctrlMatch = shortcut.ctrl
          ? event.ctrlKey || event.metaKey
          : !event.ctrlKey && !event.metaKey;
        const shiftMatch = shortcut.shift ? event.shiftKey : !event.shiftKey;
        const altMatch = shortcut.alt ? event.altKey : !event.altKey;

        if (keyMatch && ctrlMatch && shiftMatch && altMatch) {
          if (shortcut.preventDefault !== false) event.preventDefault();
          shortcut.action();
          return;
        }
      }
    },
    [enabled]
  );

  useEffect(() => {
    if (!enabled) return;
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown, enabled]);

  return shortcuts;
}

/**
 * Format a shortcut for display (e.g., "Ctrl+S", "⌘+Shift+N").
 */
export function formatShortcut(shortcut: KeyboardShortcut): string {
  const isMac = typeof window !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
  const parts: string[] = [];

  if (shortcut.ctrl) parts.push(isMac ? '⌘' : 'Ctrl');
  if (shortcut.alt) parts.push(isMac ? '⌥' : 'Alt');
  if (shortcut.shift) parts.push('Shift');

  let keyName = shortcut.key;
  if (keyName === ' ') keyName = 'Space';
  if (keyName.length === 1) keyName = keyName.toUpperCase();
  parts.push(keyName);

  return parts.join('+');
}

/**
 * Get individual key parts for rendering keyboard shortcut badges.
 */
export function getShortcutKeys(shortcut: KeyboardShortcut): string[] {
  const isMac = typeof window !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
  const keys: string[] = [];

  if (shortcut.ctrl) keys.push(isMac ? '⌘' : 'Ctrl');
  if (shortcut.alt) keys.push(isMac ? '⌥' : 'Alt');
  if (shortcut.shift) keys.push('Shift');

  let keyName = shortcut.key;
  if (keyName === ' ') keyName = 'Space';
  if (keyName === 'Escape') keyName = 'Esc';
  if (keyName === 'ArrowUp') keyName = '↑';
  if (keyName === 'ArrowDown') keyName = '↓';
  if (keyName === 'ArrowLeft') keyName = '←';
  if (keyName === 'ArrowRight') keyName = '→';
  if (keyName === 'Enter') keyName = '↵';
  if (keyName.length === 1) keyName = keyName.toUpperCase();
  keys.push(keyName);

  return keys;
}

/**
 * Group shortcuts by category for help display.
 */
export function groupShortcutsByCategory(
  shortcuts: KeyboardShortcut[]
): Map<string, KeyboardShortcut[]> {
  const groups = new Map<string, KeyboardShortcut[]>();
  for (const shortcut of shortcuts) {
    const category = shortcut.category || 'General';
    const existing = groups.get(category) || [];
    existing.push(shortcut);
    groups.set(category, existing);
  }
  return groups;
}
