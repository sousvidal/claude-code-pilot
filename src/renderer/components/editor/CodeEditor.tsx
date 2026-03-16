import { useRef, useCallback } from "react";
import { X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import Editor, { type Monaco } from "@monaco-editor/react";
import type { editor } from "monaco-editor";

import { useEditorStore } from "~/stores/editor";
import { useFilesService } from "~/services/files.service";
import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";

function getLanguageFromPath(filePath: string): string {
  const ext = filePath.split(".").pop()?.toLowerCase();
  const map: Record<string, string> = {
    ts: "typescript",
    tsx: "typescript",
    js: "javascript",
    jsx: "javascript",
    json: "json",
    html: "html",
    css: "css",
    scss: "scss",
    less: "less",
    md: "markdown",
    yaml: "yaml",
    yml: "yaml",
    xml: "xml",
    sql: "sql",
    py: "python",
    rb: "ruby",
    go: "go",
    rs: "rust",
    java: "java",
    kt: "kotlin",
    swift: "swift",
    sh: "shell",
    bash: "shell",
    zsh: "shell",
    toml: "ini",
    ini: "ini",
    env: "ini",
    dockerfile: "dockerfile",
    graphql: "graphql",
    gql: "graphql",
    svelte: "html",
    vue: "html",
    prisma: "graphql",
  };
  return map[ext ?? ""] ?? "plaintext";
}

function getFileName(filePath: string): string {
  return filePath.split("/").pop() ?? filePath;
}

export function CodeEditor() {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const activeFilePath = useEditorStore((s) => s.activeFilePath);
  const closeFile = useEditorStore((s) => s.closeFile);
  const { readFile } = useFilesService();

  const { data: content, isLoading } = useQuery({
    queryKey: ["fileContent", activeFilePath],
    queryFn: () => readFile(activeFilePath!),
    enabled: Boolean(activeFilePath),
  });

  const handleEditorMount = useCallback(
    (editorInstance: editor.IStandaloneCodeEditor, monaco: Monaco) => {
      editorRef.current = editorInstance;

      monaco.editor.defineTheme("clay-dark", {
        base: "vs-dark",
        inherit: true,
        rules: [
          { token: "comment", foreground: "6b7280", fontStyle: "italic" },
          { token: "keyword", foreground: "c084fc" },
          { token: "string", foreground: "86efac" },
          { token: "number", foreground: "fbbf24" },
          { token: "type", foreground: "67e8f9" },
        ],
        colors: {
          "editor.background": "#121620",
          "editor.foreground": "#e2e5eb",
          "editor.lineHighlightBackground": "#1a1f2e",
          "editor.selectionBackground": "#2563eb44",
          "editorLineNumber.foreground": "#4b5563",
          "editorLineNumber.activeForeground": "#9ca3af",
          "editor.inactiveSelectionBackground": "#2563eb22",
          "editorIndentGuide.background": "#1f2937",
          "editorIndentGuide.activeBackground": "#374151",
          "editorCursor.foreground": "#60a5fa",
          "editorWhitespace.foreground": "#1f2937",
        },
      });

      monaco.editor.setTheme("clay-dark");
    },
    [],
  );

  if (!activeFilePath) {
    return (
      <div className="flex h-full items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">
          Select a file to view its contents
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-background">
      <div className="flex items-center justify-between border-b border-border px-3 py-1.5">
        <div className="flex items-center gap-2 min-w-0">
          <span className="truncate text-sm text-foreground">
            {getFileName(activeFilePath)}
          </span>
          <span
            className="truncate text-xs text-muted-foreground"
            title={activeFilePath}
          >
            {activeFilePath}
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 shrink-0"
          onClick={closeFile}
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className={cn("flex-1 min-h-0", isLoading && "opacity-50")}>
        <Editor
          height="100%"
          language={getLanguageFromPath(activeFilePath)}
          value={content ?? ""}
          onMount={handleEditorMount}
          theme="clay-dark"
          options={{
            readOnly: true,
            minimap: { enabled: false },
            fontSize: 13,
            fontFamily: "'JetBrains Mono', 'Fira Code', 'SF Mono', monospace",
            fontLigatures: true,
            lineNumbers: "on",
            scrollBeyondLastLine: false,
            wordWrap: "on",
            automaticLayout: true,
            padding: { top: 8 },
            renderLineHighlight: "line",
            smoothScrolling: true,
            cursorBlinking: "smooth",
            overviewRulerBorder: false,
            hideCursorInOverviewRuler: true,
            scrollbar: {
              verticalScrollbarSize: 6,
              horizontalScrollbarSize: 6,
            },
          }}
          loading={
            <div className="flex h-full items-center justify-center">
              <p className="text-sm text-muted-foreground">
                Loading editor...
              </p>
            </div>
          }
        />
      </div>
    </div>
  );
}
