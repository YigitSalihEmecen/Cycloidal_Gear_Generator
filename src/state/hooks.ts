import { useCallback, useEffect, useState } from 'react';
import { DEFAULT_PARAMS, decodeParams, encodeParams, type Params } from '../core/params';

/** Parameters live in React state and mirror to the URL hash, so every design is a shareable link. */
export function useParams() {
  const [params, setParams] = useState<Params>(() => {
    try {
      return decodeParams(window.location.hash);
    } catch {
      return DEFAULT_PARAMS;
    }
  });

  useEffect(() => {
    const id = window.setTimeout(() => {
      const hash = encodeParams(params);
      const url = window.location.pathname + window.location.search + (hash ? `#${hash}` : '');
      try {
        window.history.replaceState(null, '', url);
      } catch {
        /* sandboxed frames may forbid it */
      }
    }, 250);
    return () => window.clearTimeout(id);
  }, [params]);

  useEffect(() => {
    const onHash = () => setParams(decodeParams(window.location.hash));
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const patch = useCallback(<K extends keyof Params>(key: K, value: Params[K]) => {
    setParams((p) => (p[key] === value ? p : { ...p, [key]: value }));
  }, []);

  return { params, setParams, patch };
}

export type ThemeChoice = 'system' | 'light' | 'dark';

export function useTheme() {
  const [choice, setChoice] = useState<ThemeChoice>(() => {
    try {
      const v = localStorage.getItem('cgg-theme');
      return v === 'light' || v === 'dark' ? v : 'system';
    } catch {
      return 'system';
    }
  });
  const [systemDark, setSystemDark] = useState(() => window.matchMedia('(prefers-color-scheme: dark)').matches);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const on = () => setSystemDark(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (choice === 'system') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', choice);
    try {
      if (choice === 'system') localStorage.removeItem('cgg-theme');
      else localStorage.setItem('cgg-theme', choice);
    } catch {
      /* storage can be blocked */
    }
  }, [choice]);

  const dark = choice === 'dark' || (choice === 'system' && systemDark);
  const cycle = useCallback(() => setChoice((c) => (c === 'system' ? 'light' : c === 'light' ? 'dark' : 'system')), []);
  return { choice, dark, cycle };
}

export function useMedia(query: string) {
  const [match, setMatch] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const on = () => setMatch(mq.matches);
    mq.addEventListener('change', on);
    on();
    return () => mq.removeEventListener('change', on);
  }, [query]);
  return match;
}
