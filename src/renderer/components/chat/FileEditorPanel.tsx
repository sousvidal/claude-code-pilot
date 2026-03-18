import { useEffect, useState } from "react";
import Editor, { DiffEditor, type BeforeMount } from "@monaco-editor/react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { X } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";

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
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [editorValue, setEditorValue] = useState<string>("");

  const fileName = filePath.split("/").pop() ?? filePath;
  const language = detectLanguage(filePath);
  const isMarkdown = language === "markdown";

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

  // Reset modes when file changes
  useEffect(() => {
    setIsDiffMode(false);
    setIsPreviewMode(false);
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

  const handleBeforeMount: BeforeMount = (monaco) => {
    const noDiagnostics = {
      noSemanticValidation: true,
      noSyntaxValidation: true,
      noSuggestionDiagnostics: true,
    };
    monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions(noDiagnostics);
    monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions(noDiagnostics);
    monaco.languages.json.jsonDefaults.setDiagnosticsOptions({ validate: false });
  };

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
          "absolute bottom-0 right-0 top-0 z-20 flex w-4/5 flex-col border-l border-border bg-background shadow-2xl",
          "transition-transform duration-200",
        )}
      >
        {/* Header */}
        <div className="flex h-10 shrink-0 items-center justify-between gap-2 border-b border-border px-3">
          <span className="truncate text-sm font-medium text-foreground">{fileName}</span>

          <div className="flex shrink-0 items-center gap-1">
            {isMarkdown && (
              <Button
                variant={isPreviewMode ? "secondary" : "ghost"}
                size="sm"
                className="h-7 text-xs"
                onClick={() => setIsPreviewMode((p) => !p)}
              >
                {isPreviewMode ? "Edit" : "Preview"}
              </Button>
            )}
            {canDiff && !isPreviewMode && (
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
          ) : isPreviewMode ? (
            <div className="h-full overflow-y-auto px-8 py-6">
              <div className="max-w-none text-sm text-foreground leading-7
                [&_p]:mb-4 [&_p:last-child]:mb-0
                [&_ul]:my-3 [&_ul]:list-disc [&_ul]:ml-5 [&_ul]:space-y-1
                [&_ol]:my-3 [&_ol]:list-decimal [&_ol]:ml-5 [&_ol]:space-y-1
                [&_li]:leading-7
                [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:mt-8 [&_h1]:mb-4 [&_h1]:first:mt-0
                [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:mt-7 [&_h2]:mb-3
                [&_h3]:text-base [&_h3]:font-semibold [&_h3]:mt-5 [&_h3]:mb-2
                [&_h4]:text-sm [&_h4]:font-semibold [&_h4]:mt-4 [&_h4]:mb-1
                [&_pre]:my-4 [&_pre]:bg-muted [&_pre]:rounded-md [&_pre]:p-4 [&_pre]:overflow-x-auto [&_pre]:text-[13px]
                [&_code]:bg-muted [&_code]:rounded [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[13px]
                [&_pre_code]:bg-transparent [&_pre_code]:p-0
                [&_blockquote]:my-4 [&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-4 [&_blockquote]:py-0.5 [&_blockquote]:text-muted-foreground
                [&_hr]:my-6 [&_hr]:border-border
                [&_table]:my-4 [&_table]:w-full [&_table]:text-sm
                [&_th]:text-left [&_th]:font-semibold [&_th]:border-b [&_th]:border-border [&_th]:pb-2 [&_th]:pr-4
                [&_td]:py-2 [&_td]:pr-4 [&_td]:border-b [&_td]:border-border/40
                [&_a]:text-accent-blue [&_a]:underline [&_a]:underline-offset-2">
                <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>
                  {editorValue}
                </ReactMarkdown>
              </div>
            </div>
          ) : isDiffMode && canDiff ? (
            <DiffEditor
              height="100%"
              language={language}
              theme="vs-dark"
              original={headContent ?? ""}
              modified={editorValue}
              beforeMount={handleBeforeMount}
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
              beforeMount={handleBeforeMount}
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
