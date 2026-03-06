import { useEffect, useState, useCallback, useRef } from 'react';

export interface UseImagePreloadOptions {
  src: string | string[];
  onLoad?: () => void;
  onError?: (error: Error) => void;
  enabled?: boolean;
}

export interface ImagePreloadState {
  isLoading: boolean;
  isLoaded: boolean;
  hasError: boolean;
  progress: number;
  loadedCount: number;
  totalCount: number;
  error: string | null;
}

export interface UseImagePreloadReturn extends ImagePreloadState {
  preload: () => void;
  reset: () => void;
}

const initialState: ImagePreloadState = {
  isLoading: false,
  isLoaded: false,
  hasError: false,
  progress: 0,
  loadedCount: 0,
  totalCount: 0,
  error: null,
};

/**
 * Preload images before they're needed in the UI.
 * Supports single or multiple images with progress tracking.
 */
export function useImagePreload({
  src,
  onLoad,
  onError,
  enabled = true,
}: UseImagePreloadOptions): UseImagePreloadReturn {
  const [state, setState] = useState<ImagePreloadState>(initialState);
  const abortControllerRef = useRef<AbortController | null>(null);
  const onLoadRef = useRef(onLoad);
  const onErrorRef = useRef(onError);

  onLoadRef.current = onLoad;
  onErrorRef.current = onError;

  const preload = useCallback(() => {
    if (abortControllerRef.current) abortControllerRef.current.abort();
    abortControllerRef.current = new AbortController();
    const { signal } = abortControllerRef.current;

    const sources = Array.isArray(src) ? src : [src];
    const total = sources.length;

    if (total === 0) {
      setState({ ...initialState, isLoaded: true, progress: 100 });
      onLoadRef.current?.();
      return;
    }

    setState({ ...initialState, isLoading: true, totalCount: total });

    let loadedCount = 0;
    let errorMessage: string | null = null;

    const promises = sources.map(
      (imgSrc) =>
        new Promise<void>((resolve, reject) => {
          if (signal.aborted) { reject(new Error('Aborted')); return; }

          const img = new Image();
          signal.addEventListener('abort', () => { img.src = ''; reject(new Error('Aborted')); });

          img.onload = () => {
            loadedCount++;
            setState((prev) => ({ ...prev, loadedCount, progress: (loadedCount / total) * 100 }));
            resolve();
          };
          img.onerror = () => {
            errorMessage = `Failed to load image: ${imgSrc}`;
            reject(new Error(errorMessage));
          };
          img.src = imgSrc;
        })
    );

    Promise.all(promises)
      .then(() => {
        if (signal.aborted) return;
        setState({ isLoading: false, isLoaded: true, hasError: false, progress: 100, loadedCount: total, totalCount: total, error: null });
        onLoadRef.current?.();
      })
      .catch((error) => {
        if (signal.aborted || error.message === 'Aborted') return;
        setState({ isLoading: false, isLoaded: false, hasError: true, progress: (loadedCount / total) * 100, loadedCount, totalCount: total, error: errorMessage || error.message });
        onErrorRef.current?.(error);
      });
  }, [src]);

  const reset = useCallback(() => {
    if (abortControllerRef.current) abortControllerRef.current.abort();
    setState(initialState);
  }, []);

  useEffect(() => {
    if (enabled) preload();
    return () => { if (abortControllerRef.current) abortControllerRef.current.abort(); };
  }, [enabled, preload]);

  return { ...state, preload, reset };
}

/**
 * Preload a single image imperatively.
 */
export function preloadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    img.src = src;
  });
}

/**
 * Preload multiple images with optional progress callback.
 */
export async function preloadImages(
  sources: string[],
  onProgress?: (progress: number) => void
): Promise<HTMLImageElement[]> {
  let loaded = 0;
  const total = sources.length;
  return Promise.all(
    sources.map((src) =>
      preloadImage(src).then((img) => {
        loaded++;
        onProgress?.((loaded / total) * 100);
        return img;
      })
    )
  );
}
