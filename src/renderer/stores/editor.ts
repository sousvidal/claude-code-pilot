import { create } from "zustand";

interface EditorState {
  activeFilePath: string | null;
  openFile: (filePath: string) => void;
  closeFile: () => void;
}

export const useEditorStore = create<EditorState>((set) => ({
  activeFilePath: null,
  openFile: (filePath) => set({ activeFilePath: filePath }),
  closeFile: () => set({ activeFilePath: null }),
}));
