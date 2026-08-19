import { beforeEach, afterEach, vi } from 'vitest';

// Polyfill scrollIntoView
if (typeof Element !== 'undefined' && !Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = vi.fn();
}

// Polyfill scrollTo
if (typeof window !== 'undefined') {
  window.scrollTo = vi.fn();
}

// Mock window.matchMedia
if (typeof window !== 'undefined') {
  window.matchMedia =
    window.matchMedia ||
    function () {
      return {
        matches: false,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn()
      };
    };
}

// Mock crypto.randomUUID
if (typeof window !== 'undefined' && !window.crypto?.randomUUID) {
  let counter = 0;
  // @ts-ignore
  window.crypto = window.crypto || {};
  window.crypto.randomUUID = () => `mock-uuid-${++counter}-${Date.now()}`;
}

// Mock clipboard
if (typeof navigator !== 'undefined') {
  let clipboardText = '';
  // @ts-ignore
  navigator.clipboard = {
    writeText: vi.fn(async (text: string) => {
      clipboardText = text;
      return Promise.resolve();
    }),
    readText: vi.fn(async () => Promise.resolve(clipboardText))
  };
}

// Mock URL.createObjectURL and revokeObjectURL
if (typeof URL !== 'undefined') {
  URL.createObjectURL = vi.fn(() => 'blob:mock-url');
  URL.revokeObjectURL = vi.fn();
}

// Clean storages before each test
beforeEach(() => {
  if (typeof window !== 'undefined') {
    window.localStorage.clear();
    window.sessionStorage.clear();
  }
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});
