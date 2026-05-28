import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

export interface ClaimAnalysis {
  claim: string;
  accurate: boolean;
  explanation: string;
}

export interface FactSource {
  title: string;
  domain: string;
}

export interface ScanRecord {
  id: string;
  score: number;
  verdict: string;
  summary: string;
  reasoning: string;
  claims: ClaimAnalysis[];
  sources: FactSource[];
  usedGrounding: boolean;
  mode: string;
  analyzedAt: string;
  imageUri?: string;
  inputText?: string;
  inputUrl?: string;
}

interface HistoryContextValue {
  records: ScanRecord[];
  addRecord: (record: ScanRecord) => void;
  clearHistory: () => void;
}

const HistoryContext = createContext<HistoryContextValue>({
  records: [],
  addRecord: () => {},
  clearHistory: () => {},
});

const STORAGE_KEY = "@factscan_history";
const MAX_RECORDS = 50;

export function HistoryProvider({ children }: { children: React.ReactNode }) {
  const [records, setRecords] = useState<ScanRecord[]>([]);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (raw) {
        try {
          setRecords(JSON.parse(raw));
        } catch {}
      }
    });
  }, []);

  const addRecord = useCallback((record: ScanRecord) => {
    setRecords((prev) => {
      const updated = [record, ...prev].slice(0, MAX_RECORDS);
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const clearHistory = useCallback(() => {
    setRecords([]);
    AsyncStorage.removeItem(STORAGE_KEY);
  }, []);

  return (
    <HistoryContext.Provider value={{ records, addRecord, clearHistory }}>
      {children}
    </HistoryContext.Provider>
  );
}

export function useHistory() {
  return useContext(HistoryContext);
}
