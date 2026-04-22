import { useEffect, useState, useCallback } from 'react';

/**
 * Per-device user preferences stored in localStorage. No schema migration needed.
 *
 * Keys are namespaced under "shikshantaram_pref_*" so they're easy to wipe
 * and never collide with other apps on the same domain.
 */

const PREFIX = 'shikshantaram_pref_';

export const PREF_KEYS = {
  lowBalanceThreshold: `${PREFIX}lowBalanceThreshold`,
  reducedMotion:       `${PREFIX}reducedMotion`,
} as const;

export const DEFAULTS = {
  lowBalanceThreshold: 20,
  reducedMotion: false,
};

/* ───────── Low-balance threshold ───────── */
export function getLowBalanceThreshold(): number {
  if (typeof window === 'undefined') return DEFAULTS.lowBalanceThreshold;
  const raw = window.localStorage.getItem(PREF_KEYS.lowBalanceThreshold);
  const parsed = raw ? parseInt(raw, 10) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULTS.lowBalanceThreshold;
}

export function setLowBalanceThreshold(value: number) {
  const safe = Math.max(1, Math.min(500, Math.round(value)));
  window.localStorage.setItem(PREF_KEYS.lowBalanceThreshold, String(safe));
  window.dispatchEvent(new CustomEvent('shikshantaram-prefs-changed', { detail: { key: 'lowBalanceThreshold', value: safe } }));
}

/* ───────── Reduced motion ───────── */
export function getReducedMotion(): boolean {
  if (typeof window === 'undefined') return DEFAULTS.reducedMotion;
  return window.localStorage.getItem(PREF_KEYS.reducedMotion) === '1';
}

export function setReducedMotion(value: boolean) {
  window.localStorage.setItem(PREF_KEYS.reducedMotion, value ? '1' : '0');
  applyReducedMotion(value);
  window.dispatchEvent(new CustomEvent('shikshantaram-prefs-changed', { detail: { key: 'reducedMotion', value } }));
}

const REDUCED_MOTION_STYLE_ID = 'shikshantaram-reduced-motion-style';

export function applyReducedMotion(enabled: boolean) {
  if (typeof document === 'undefined') return;
  const existing = document.getElementById(REDUCED_MOTION_STYLE_ID);
  if (!enabled) {
    if (existing) existing.remove();
    return;
  }
  if (existing) return;
  const style = document.createElement('style');
  style.id = REDUCED_MOTION_STYLE_ID;
  style.textContent = `
    *, *::before, *::after {
      animation-duration: 0.001ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.001ms !important;
      scroll-behavior: auto !important;
    }
  `;
  document.head.appendChild(style);
}

/* ───────── React hooks ───────── */
export function useReducedMotion(): [boolean, (v: boolean) => void] {
  const [val, setVal] = useState<boolean>(() => getReducedMotion());
  useEffect(() => { applyReducedMotion(val); }, [val]);
  const update = useCallback((v: boolean) => { setReducedMotion(v); setVal(v); }, []);
  return [val, update];
}

export function useLowBalanceThreshold(): [number, (v: number) => void] {
  const [val, setVal] = useState<number>(() => getLowBalanceThreshold());
  const update = useCallback((v: number) => {
    const safe = Math.max(1, Math.min(500, Math.round(v)));
    setLowBalanceThreshold(safe);
    setVal(safe);
  }, []);
  return [val, update];
}
