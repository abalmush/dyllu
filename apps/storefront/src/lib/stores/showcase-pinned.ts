import { create } from "zustand";

interface ShowcasePinnedState {
  pinnedCount: number;
  enter: () => void;
  exit: () => void;
}

export const useShowcasePinned = create<ShowcasePinnedState>((set) => ({
  pinnedCount: 0,
  enter: () => set((state) => ({ pinnedCount: state.pinnedCount + 1 })),
  exit: () =>
    set((state) => ({ pinnedCount: Math.max(0, state.pinnedCount - 1) })),
}));
