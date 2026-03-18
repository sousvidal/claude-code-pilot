import { useEffect, useState } from "react";
import Editor, { DiffEditor } from "@monaco-editor/react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { X } from "lucide-react";

import { useUIStore } from "~/stores/ui";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";

// ---------------------------------------------------------------------------
// Language detection
// ---------------------------------------------------------------------------

const EXT_TO_LANGUAGE: Record<string, string> = {
  ts: "typescript",
  tsx: "typescript",
  js: "javascript",
  jsx: "javascript",
  mjs: "javascript",
  cjs: "javascript",
  json: "json",
  jsonc: "json",
  css: "css",
  scss: "scss",
  less: "less",
  html: "html",
  htm: "html",
  xml: "xml",
  svg: "xml",
  md: "markdown",
  mdx: "markdown",
  py: "python",
  rb: "ruby",
  go: "go",
  rs: "rust",
  java: "java",
  kt: "kotlin",
  swift: "swift",
  c: "c",
  cpp: "cpp",
  cc: "cpp",
  h: "c",
  hpp: "cpp",
  cs: "csharp",
  php: "php",
  sh: "shell",
  bash: "shell",
  zsh: "shell",
  fish: "shell",
  ps1: "powershell",
  yaml: "yaml",
  yml: "yaml",
  toml: "ini",
  ini: "ini",
  env: "ini",
  sql: "sql",
  graphql: "graphql",
  gql: "graphql",
  prisma: "prisma",
  dockerfile: "dockerfile",
};

function detectLanguage(filePath: string): string {
  const name = filePath.split("/").pop() ?? filePath;
  if (name.toLowerCase() === "dockerfile") return "dockerfile";
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  return EXT_TO_LANGUAGE[ext] ?? "plaintext";
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface FileEditorPanelProps {
  filePath: string;
}

export function FileEditorPanel({ filePath }: FileEditorPanelProps) {
  const setOpenEditorFile = useUIStore((s) => s.setOpenEditorFile);

  const [isDiffMode, setIsDiffMode] = useState(false);
  const [editorValue, setEditorValue] = useState<string>("");

  const fileName = filePath.split("/").pop() ?? filePath;
  const language = detectLanguage(filePath);

  const { data: fileContent, isLoading: isLoadingFile } = useQuery({
    queryKey: ["file", filePath],
    queryFn: () => window.api.files.readFile(filePath),
  });

  const { data: headContent } = useQuery({
    queryKey: ["fileAtHead", filePath],
    queryFn: () => window.api.git.getFileAtHead(filePath),
  });

  // Sync editor value when file loads
  useEffect(() => {
    if (fileContent !== undefined) {
      setEditorValue(fileContent);
    }
  }, [fileContent]);

  // Reset diff mode when file changes
  useEffect(() => {
    setIsDiffMode(false);
  }, [filePath]);

  const handleClose = () => {
    setOpenEditorFile(null);
  };

  const handleSave = async () => {
    try {
      await window.api.files.writeFile(filePath, editorValue);
      toast.success("File saved");
    } catch {
      toast.error("Failed to save file");
    }
  };

  // Keyboard shortcuts: Cmd/Ctrl+S to save, Escape to close
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        void handleSave();
      }
      if (e.key === "Escape") {
        handleClose();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editorValue, filePath]);

  const canDiff = headContent !== null && headContent !== undefined;

  return (
    <>
      {/* Backdrop */}
      <div
        className="absolute inset-0 z-10"
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        className={cn(
          "absolute bottom-0 right-0 top-0 z-20 flex w-3/5 flex-col border-l border-border bg-background shadow-2xl",
          "transition-transform duration-200",
        )}
      >
        {/* Header */}
        <div className="flex h-10 shrink-0 items-center justify-between gap-2 border-b border-border px-3">
          <span className="truncate text-sm font-medium text-foreground">{fileName}</span>

          <div className="flex shrink-0 items-center gap-1">
            {canDiff && (
              <Button
                variant={isDiffMode ? "secondary" : "ghost"}
                size="sm"
                className="h-7 text-xs"
                onClick={() => setIsDiffMode((d) => !d)}
              >
                {isDiffMode ? "Editor" : "Diff"}
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => void handleSave()}
            >
              Save
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={handleClose}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Editor body */}
        <div className="relative min-h-0 flex-1">
          {isLoadingFile ? (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              Loading…
            </div>
          ) : isDiffMode && canDiff ? (
            <DiffEditor
              height="100%"
              language={language}
              theme="vs-dark"
              original={headContent ?? ""}
              modified={editorValue}
              options={{
                renderSideBySide: false,
                readOnly: false,
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                fontSize: 13,
              }}
              onMount={(_editor) => {
                // Keep editorValue in sync when the modified model changes
                const modifiedEditor = _editor.getModifiedEditor();
                modifiedEditor.onDidChangeModelContent(() => {
                  setEditorValue(modifiedEditor.getValue());
                });
              }}
            />
          ) : (
            <Editor
              height="100%"
              language={language}
              theme="vs-dark"
              value={editorValue}
              onChange={(value) => setEditorValue(value ?? "")}
              options={{
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                fontSize: 13,
                wordWrap: "on",
              }}
            />
          )}
        </div>
      </div>
    </>
  );
}
