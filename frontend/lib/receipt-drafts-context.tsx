"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import type { ReceiptDraft } from "@/lib/archive-types";

interface ReceiptDraftsContextValue {
  receiptDrafts: ReceiptDraft[];
  enqueueReceiptDraft: (draft: ReceiptDraft) => void;
  removeReceiptDraft: (id: string) => void;
}

const ReceiptDraftsContext = createContext<ReceiptDraftsContextValue | null>(null);

export function ReceiptDraftsProvider({ children }: { children: ReactNode }) {
  const [receiptDrafts, setReceiptDrafts] = useState<ReceiptDraft[]>([]);

  const enqueueReceiptDraft = useCallback((draft: ReceiptDraft) => {
    setReceiptDrafts((current) => {
      if (current.some((existing) => existing.id === draft.id)) {
        return current;
      }
      return [draft, ...current];
    });
  }, []);

  const removeReceiptDraft = useCallback((id: string) => {
    setReceiptDrafts((current) => current.filter((existing) => existing.id !== id));
  }, []);

  return (
    <ReceiptDraftsContext.Provider value={{ receiptDrafts, enqueueReceiptDraft, removeReceiptDraft }}>
      {children}
    </ReceiptDraftsContext.Provider>
  );
}

export function useReceiptDrafts() {
  const ctx = useContext(ReceiptDraftsContext);
  if (!ctx) throw new Error("useReceiptDrafts must be used inside ReceiptDraftsProvider");
  return ctx;
}
