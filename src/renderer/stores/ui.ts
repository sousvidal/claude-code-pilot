import { create } from "zustand";

interface UIState {
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;

  touchedFilesSidebarCollapsed: boolean;
  toggleTouchedFilesSidebar: () => void;
  setTouchedFilesSidebarCollapsed: (collapsed: boolean) => void;

  openEditorFilePath: string | null;
  setOpenEditorFile: (path: string | null) => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarCollapsed: false,

  toggleSidebar: () =>
    set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),

  touchedFilesSidebarCollapsed: false,

  toggleTouchedFilesSidebar: () =>
    set((state) => ({ touchedFilesSidebarCollapsed: !state.touchedFilesSidebarCollapsed })),

  setTouchedFilesSidebarCollapsed: (collapsed) =>
    set({ touchedFilesSidebarCollapsed: collapsed }),

  openEditorFilePath: null,

  setOpenEditorFile: (path) => set({ openEditorFilePath: path }),
}));
