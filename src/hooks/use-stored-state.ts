"use client";

import * as React from "react";

const noopSubscribe = () => () => {};
const storageListeners = new Map<string, Set<() => void>>();
const snapshotCache = new Map<string, { raw: string | null; value: unknown }>();

function emitKeyChange(key: string): void {
  const listeners = storageListeners.get(key);
  if (!listeners) return;
  listeners.forEach((listener) => listener());
}

function subscribeToKey(key: string, listener: () => void): () => void {
  let listeners = storageListeners.get(key);
  if (!listeners) {
    listeners = new Set();
    storageListeners.set(key, listeners);
  }
  listeners.add(listener);

  const handleStorage = (event: StorageEvent) => {
    if (event.key === null || event.key === key) {
      listener();
    }
  };

  if (typeof window !== "undefined") {
    window.addEventListener("storage", handleStorage);
  }

  return () => {
    listeners?.delete(listener);
    if (typeof window !== "undefined") {
      window.removeEventListener("storage", handleStorage);
    }
  };
}

/**
 * Hydration-safe flag that returns `false` during SSR/hydration and `true` on the client
 * without triggering synchronous `setState` inside an effect.
 */
export function useIsClient(): boolean {
  return React.useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false
  );
}

/**
 * Synchronizes JSON-serializable state with `localStorage` via `useSyncExternalStore`,
 * maintaining referential stability when the serialized payload is unchanged.
 */
export function useStoredState<T>(
  key: string,
  initialValue: T
): [T, React.Dispatch<React.SetStateAction<T>>] {
  const fallbackRef = React.useRef<T>(initialValue);

  const subscribe = React.useCallback(
    (listener: () => void) => subscribeToKey(key, listener),
    [key]
  );

  const getSnapshot = React.useCallback((): T => {
    if (typeof window === "undefined") {
      return fallbackRef.current;
    }

    try {
      const raw = window.localStorage.getItem(key);
      if (raw === null) {
        snapshotCache.delete(key);
        return fallbackRef.current;
      }

      const cached = snapshotCache.get(key);
      if (cached && cached.raw === raw) {
        return cached.value as T;
      }

      const parsed = JSON.parse(raw) as T;
      snapshotCache.set(key, { raw, value: parsed });
      return parsed;
    } catch {
      return fallbackRef.current;
    }
  }, [key]);

  const getServerSnapshot = React.useCallback((): T => fallbackRef.current, []);

  const value = React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setValue: React.Dispatch<React.SetStateAction<T>> = React.useCallback(
    (updater) => {
      const current = getSnapshot();
      const next =
        typeof updater === "function"
          ? (updater as (prevState: T) => T)(current)
          : updater;
      try {
        const serialized = JSON.stringify(next);
        snapshotCache.set(key, { raw: serialized, value: next });
        if (typeof window !== "undefined") {
          window.localStorage.setItem(key, serialized);
        }
      } catch {
        // Ignore storage quota or serialization errors in restricted contexts.
      }
      emitKeyChange(key);
    },
    [getSnapshot, key]
  );

  return [value, setValue];
}

const THEME_STORAGE_KEY = "breathewise_theme";

function subscribeToTheme(listener: () => void): () => void {
  const unsubscribeStorage = subscribeToKey(THEME_STORAGE_KEY, listener);
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return unsubscribeStorage;
  }

  const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
  mediaQuery.addEventListener("change", listener);

  return () => {
    unsubscribeStorage();
    mediaQuery.removeEventListener("change", listener);
  };
}

function getThemeSnapshot(): "light" | "dark" {
  if (typeof window === "undefined") {
    return "light";
  }

  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === "light" || stored === "dark") {
      return stored;
    }
  } catch {
    // Ignore storage read restrictions.
  }

  if (typeof window.matchMedia === "function") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return "light";
}

/**
 * Synchronizes a plain string value with `localStorage` via `useSyncExternalStore`.
 */
export function useStoredString(
  key: string,
  initialValue = ""
): [string, (next: string) => void] {
  const subscribe = React.useCallback(
    (listener: () => void) => subscribeToKey(key, listener),
    [key]
  );

  const getSnapshot = React.useCallback((): string => {
    if (typeof window === "undefined") {
      return initialValue;
    }
    try {
      return window.localStorage.getItem(key) ?? initialValue;
    } catch {
      return initialValue;
    }
  }, [key, initialValue]);

  const getServerSnapshot = React.useCallback((): string => initialValue, [initialValue]);

  const value = React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setValue = React.useCallback(
    (next: string) => {
      try {
        if (typeof window !== "undefined") {
          window.localStorage.setItem(key, next);
        }
      } catch {
        // Ignore storage write errors in restricted contexts.
      }
      emitKeyChange(key);
    },
    [key]
  );

  return [value, setValue];
}

/**
 * Reads and updates the user's light/dark theme preference backed by `localStorage`
 * and OS `prefers-color-scheme`.
 */
export function useThemePreference(): ["light" | "dark", (next: "light" | "dark") => void] {
  const theme = React.useSyncExternalStore<"light" | "dark">(
    subscribeToTheme,
    getThemeSnapshot,
    () => "light"
  );

  const setTheme = React.useCallback((next: "light" | "dark") => {
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Ignore storage write restrictions.
    }
    emitKeyChange(THEME_STORAGE_KEY);
  }, []);

  return [theme, setTheme];
}
