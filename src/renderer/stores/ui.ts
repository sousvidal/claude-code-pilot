import { create } from "zustand";

type SidebarPanel = "sessions" | "settings";

interface UIState {
  activePanel: SidebarPanel;
  sidebarCollapsed: boolean;
  setActivePanel: (panel: SidebarPanel) => void;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  activePanel: "sessions",
  sidebarCollapsed: false,

  setActivePanel: (panel) =>
    set((state) => {
      if (state.activePanel === panel && !state.sidebarCollapsed) {
        return { sidebarCollapsed: true };
      }
      return { activePanel: panel, sidebarCollapsed: false };
    }),

  toggleSidebar: () =>
    set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
}));
