import { create } from "zustand";

interface WelcomeState {
  show: boolean;
  name: string;
  ready: boolean; // dashboard loaded
  trigger: (name: string) => void;
  setReady: () => void;
  clear: () => void;
}

export const useWelcomeStore = create<WelcomeState>((set) => ({
  show: false,
  name: "",
  ready: false,
  trigger: (name: string) => set({ show: true, name, ready: false }),
  setReady: () => set({ ready: true }),
  clear: () => set({ show: false, name: "", ready: false }),
}));
