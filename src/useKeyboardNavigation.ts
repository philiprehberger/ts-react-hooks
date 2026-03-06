import { useEffect, useRef, useState, useCallback } from 'react';

export interface UseKeyboardNavigationOptions {
  itemCount: number;
  onSelect?: (index: number) => void;
  orientation?: 'horizontal' | 'vertical';
  loop?: boolean;
  initialIndex?: number;
}

export interface UseKeyboardNavigationReturn {
  activeIndex: number;
  setActiveIndex: React.Dispatch<React.SetStateAction<number>>;
  setItemRef: (index: number) => (el: HTMLElement | null) => void;
  handleKeyDown: (e: React.KeyboardEvent) => void;
  getItemProps: (index: number) => {
    ref: (el: HTMLElement | null) => void;
    tabIndex: number;
    'aria-selected': boolean;
  };
}

/**
 * Keyboard navigation for lists, tabs, and menus.
 * Implements WAI-ARIA roving tabindex pattern with Home/End support.
 */
export function useKeyboardNavigation({
  itemCount,
  onSelect,
  orientation = 'vertical',
  loop = true,
  initialIndex = 0,
}: UseKeyboardNavigationOptions): UseKeyboardNavigationReturn {
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const itemRefs = useRef<(HTMLElement | null)[]>([]);

  useEffect(() => {
    itemRefs.current = itemRefs.current.slice(0, itemCount);
  }, [itemCount]);

  const setItemRef = useCallback(
    (index: number) => (el: HTMLElement | null) => {
      itemRefs.current[index] = el;
    },
    []
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const nextKey = orientation === 'vertical' ? 'ArrowDown' : 'ArrowRight';
      const prevKey = orientation === 'vertical' ? 'ArrowUp' : 'ArrowLeft';

      switch (e.key) {
        case nextKey:
          e.preventDefault();
          setActiveIndex((prev) => {
            const next = prev + 1;
            return next >= itemCount ? (loop ? 0 : prev) : next;
          });
          break;
        case prevKey:
          e.preventDefault();
          setActiveIndex((prev) => {
            const next = prev - 1;
            return next < 0 ? (loop ? itemCount - 1 : prev) : next;
          });
          break;
        case 'Home':
          e.preventDefault();
          setActiveIndex(0);
          break;
        case 'End':
          e.preventDefault();
          setActiveIndex(itemCount - 1);
          break;
        case 'Enter':
        case ' ':
          e.preventDefault();
          onSelect?.(activeIndex);
          break;
      }
    },
    [activeIndex, itemCount, loop, onSelect, orientation]
  );

  useEffect(() => {
    const activeElement = itemRefs.current[activeIndex];
    if (activeElement && document.activeElement !== activeElement) {
      activeElement.focus();
    }
  }, [activeIndex]);

  const getItemProps = useCallback(
    (index: number) => ({
      ref: setItemRef(index),
      tabIndex: index === activeIndex ? 0 : -1,
      'aria-selected': index === activeIndex,
    }),
    [activeIndex, setItemRef]
  );

  return { activeIndex, setActiveIndex, setItemRef, handleKeyDown, getItemProps };
}
