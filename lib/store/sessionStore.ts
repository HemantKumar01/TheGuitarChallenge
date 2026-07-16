'use client';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { MistakeEvent, SideQuest } from '../analysis/mistakeAnalysis';

export type BackingMode = 'full' | 'instrumental' | 'drums';

export interface SessionStore {
  // Timer
  totalSeconds: number;
  elapsed: number;
  isPaused: boolean;
  hasStarted: boolean;

  // Progress
  currentHour: number;
  completedExercises: string[];
  hourCompletionTime: Record<number, number>; // hour -> elapsed seconds when completed

  // Mic data
  mistakes: MistakeEvent[];
  sideQuests: SideQuest[];
  isMicActive: boolean;

  // Song practice
  selectedSongId: string;
  backingMode: BackingMode;
  practiceSpeed: number; // 0.5 - 1.0

  // Actions
  startSession: () => void;
  pauseSession: () => void;
  resumeSession: () => void;
  tickElapsed: (delta: number) => void;
  setCurrentHour: (hour: number) => void;
  completeExercise: (id: string) => void;
  addMistake: (m: MistakeEvent) => void;
  setSideQuests: (quests: SideQuest[]) => void;
  completeSideQuest: (id: string) => void;
  setMicActive: (active: boolean) => void;
  setSelectedSong: (id: string) => void;
  setBackingMode: (mode: BackingMode) => void;
  setPracticeSpeed: (speed: number) => void;
  resetSession: () => void;
}

const TOTAL_SECONDS = 8 * 60 * 60; // 8 hours

export const useSessionStore = create<SessionStore>()(
  persist(
    (set) => ({
      totalSeconds: TOTAL_SECONDS,
      elapsed: 0,
      isPaused: false,
      hasStarted: false,
      currentHour: 0,
      completedExercises: [],
      hourCompletionTime: {},
      mistakes: [],
      sideQuests: [],
      isMicActive: false,
      selectedSongId: 'horse-with-no-name',
      backingMode: 'instrumental',
      practiceSpeed: 0.8,

      startSession: () => set({ hasStarted: true, isPaused: false }),
      pauseSession: () => set({ isPaused: true }),
      resumeSession: () => set({ isPaused: false }),
      tickElapsed: (delta) => set((s) => ({
        elapsed: Math.min(s.elapsed + delta, s.totalSeconds),
      })),
      setCurrentHour: (hour) => set({ currentHour: hour }),
      completeExercise: (id) => set((s) => ({
        completedExercises: s.completedExercises.includes(id)
          ? s.completedExercises
          : [...s.completedExercises, id],
      })),
      addMistake: (m) => set((s) => ({
        mistakes: [...s.mistakes.slice(-200), m], // keep last 200
      })),
      setSideQuests: (quests) => set({ sideQuests: quests }),
      completeSideQuest: (id) => set((s) => ({
        sideQuests: s.sideQuests.map((q) =>
          q.id === id ? { ...q, completed: true } : q
        ),
      })),
      setMicActive: (active) => set({ isMicActive: active }),
      setSelectedSong: (id) => set({ selectedSongId: id }),
      setBackingMode: (mode) => set({ backingMode: mode }),
      setPracticeSpeed: (speed) => set({ practiceSpeed: speed }),
      resetSession: () => set({
        elapsed: 0,
        isPaused: false,
        hasStarted: false,
        currentHour: 0,
        completedExercises: [],
        hourCompletionTime: {},
        mistakes: [],
        sideQuests: [],
        isMicActive: false,
        backingMode: 'instrumental',
        practiceSpeed: 0.8,
      }),
    }),
    {
      name: 'guitar-challenge-session',
      partialize: (s) => ({
        elapsed: s.elapsed,
        hasStarted: s.hasStarted,
        currentHour: s.currentHour,
        completedExercises: s.completedExercises,
        hourCompletionTime: s.hourCompletionTime,
        mistakes: s.mistakes,
        sideQuests: s.sideQuests,
        selectedSongId: s.selectedSongId,
        backingMode: s.backingMode,
        practiceSpeed: s.practiceSpeed,
      }),
    }
  )
);
