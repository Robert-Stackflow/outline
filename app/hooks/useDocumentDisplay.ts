import * as React from "react";
import { DocumentFontFamily } from "@shared/types";

export type DocumentDisplay = {
  fontFamily: DocumentFontFamily;
  smallerText: boolean;
  fullWidth: boolean;
  locked: boolean;
};

const DEFAULT: DocumentDisplay = {
  fontFamily: DocumentFontFamily.Default,
  smallerText: false,
  fullWidth: false,
  locked: false,
};

const STORAGE_PREFIX = "doc-display:";

/** Custom event name fired on the window when a document's display prefs change. */
const CHANGE_EVENT = "document-display-change";

function read(documentId: string | undefined): DocumentDisplay {
  if (!documentId || typeof window === "undefined") {
    return DEFAULT;
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_PREFIX + documentId);
    if (!raw) {
      return DEFAULT;
    }
    return { ...DEFAULT, ...JSON.parse(raw) };
  } catch {
    return DEFAULT;
  }
}

function write(documentId: string, next: DocumentDisplay) {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.setItem(
      STORAGE_PREFIX + documentId,
      JSON.stringify(next)
    );
    window.dispatchEvent(
      new CustomEvent(CHANGE_EVENT, { detail: { documentId, next } })
    );
  } catch {
    // ignore quota errors
  }
}

/**
 * Per-document display preferences (font, size, full-width, lock) persisted
 * to localStorage and applied to <html> data attributes so global CSS can
 * react. Subscribes to a custom event so multiple components stay in sync.
 *
 * @param documentId the active document. When undefined the hook reads/writes
 *   nothing and returns defaults.
 */
export function useDocumentDisplay(documentId: string | undefined) {
  const [state, setState] = React.useState<DocumentDisplay>(() =>
    read(documentId)
  );

  React.useEffect(() => {
    setState(read(documentId));
  }, [documentId]);

  React.useEffect(() => {
    if (!documentId) {
      return;
    }
    const handler = (ev: Event) => {
      const detail = (ev as CustomEvent).detail as {
        documentId: string;
        next: DocumentDisplay;
      };
      if (detail.documentId === documentId) {
        setState(detail.next);
      }
    };
    window.addEventListener(CHANGE_EVENT, handler);
    return () => window.removeEventListener(CHANGE_EVENT, handler);
  }, [documentId]);

  // Reflect onto <html data-...> attributes so global styles apply.
  React.useEffect(() => {
    // No-op: we no longer write to <html> because that races with document
    // switches (the previous document briefly renders under the next
    // document's preferences). The display state is now consumed by the
    // Document scene container directly via data attributes scoped to the
    // mounted document.
  }, [state.smallerText, state.fontFamily, state.locked]);

  const set = React.useCallback(
    <K extends keyof DocumentDisplay>(key: K, value: DocumentDisplay[K]) => {
      if (!documentId) {
        return;
      }
      const next = { ...state, [key]: value };
      write(documentId, next);
      setState(next);
    },
    [documentId, state]
  );

  return { state, set };
}
