import type { ToolResult } from "../../../shared/types";
import { CopyButton } from "~/components/ui/copy-button";
import { CodeHighlight } from "./CodeHighlight";
import { EditDiffView } from "./EditDiffView";

interface ToolResultContentProps {
  toolName: string;
  input: Record<string, unknown>;
  result?: ToolResult;
}

function parseContent(content: string): { stdout?: string; stderr?: string; text?: string } {
  try {
    const parsed = JSON.parse(content) as Record<string, unknown>;
    return {
      stdout: typeof parsed.stdout === "string" ? parsed.stdout : undefined,
      stderr: typeof parsed.stderr === "string" ? parsed.stderr : undefined,
      text: typeof parsed.text === "string" ? parsed.text : undefined,
    };
  } catch {
    return { text: content };
  }
}

function parseGrepResults(content: string): Array<{ file: string; lines: string[] }> {
  try {
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed)) {
      return parsed.map((item: { path?: string; file?: string; matches?: string[] }) => ({
        file: (item.path ?? item.file ?? "unknown") as string,
        lines: (item.matches ?? []) as string[],
      }));
    }
    if (typeof parsed === "object" && parsed.results) {
      return (parsed.results as Array<{ path?: string; matches?: string[] }>).map((r) => ({
        file: (r.path ?? "unknown") as string,
        lines: (r.matches ?? []) as string[],
      }));
    }
  } catch {
    // fallback: treat as plain text
  }
  return [{ file: "output", lines: content.split("\n").filter(Boolean) }];
}

function stripReadContent(content: string): string {
  return content
    .replace(/<system-reminder>[\s\S]*?<\/system-reminder>/g, "")
    .split("\n")
    .map((line) => line.replace(/^\s*\d+\|/, ""))
    .join("\n")
    .trim();
}

function parseWebSearchResults(content: string): Array<{ title?: string; url?: string; snippet?: string }> {
  try {
    const parsed = JSON.parse(content);
    const results = Array.isArray(parsed) ? parsed : parsed.results ?? [];
    return results.map((r: Record<string, unknown>) => ({
      title: typeof r.title === "string" ? r.title : undefined,
      url: typeof r.url === "string" ? r.url : undefined,
      snippet: typeof r.snippet === "string" ? r.snippet : undefined,
    }));
  } catch {
    return [{ snippet: content }];
  }
}


function FilePath({ path }: { path: string }) {
  return (
    <span className="font-mono text-xs text-muted-foreground">
      {path}
    </span>
  );
}

export function ToolResultContent({ toolName, input, result }: ToolResultContentProps) {
  if (!result) {
    return (
      <div className="rounded-md bg-muted/50 px-3 py-2 text-sm text-muted-foreground italic">
        No result yet
      </div>
    );
  }

  const content = typeof result.content === "string" ? result.content : String(result.content ?? "");
  const path = typeof input.file_path === "string" ? input.file_path : (typeof input.path === "string" ? input.path : undefined);

  switch (toolName) {
    case "Read":
    case "Write": {
      const displayContent = toolName === "Read" ? stripReadContent(content) : content;
      return (
        <div className="flex flex-col gap-2">
          {path && <FilePath path={path} />}
          <div className="relative group/code">
            <CopyButton text={displayContent} />
            <CodeHighlight code={displayContent} filePath={path} />
          </div>
        </div>
      );
    }

    case "Bash": {
      const { stdout, stderr, text } = parseContent(content);
      const cmd = typeof input.command === "string" ? input.command : "";
      return (
        <div className="flex flex-col gap-2">
          <div className="font-mono text-[13px] text-muted-foreground">
            <span className="text-accent-green">$</span> {cmd}
          </div>
          {stdout !== undefined && (
            <div className="relative group/code">
              <CopyButton text={stdout} />
              <pre className="max-h-48 overflow-auto rounded-md bg-code-bg px-4 py-3 font-mono text-[13px] text-foreground">
                {stdout}
              </pre>
            </div>
          )}
          {stderr !== undefined && stderr.length > 0 && (
            <pre className="max-h-32 overflow-auto rounded-md bg-code-bg px-4 py-3 font-mono text-[13px] text-accent-red">
              {stderr}
            </pre>
          )}
          {text !== undefined && !stdout && !stderr && (
            <pre className="max-h-48 overflow-auto rounded-md bg-code-bg px-4 py-3 font-mono text-[13px] text-foreground">
              {text}
            </pre>
          )}
          {!stdout && !stderr && !text && (
            <pre className="max-h-48 overflow-auto rounded-md bg-code-bg px-4 py-3 font-mono text-[13px] text-foreground">
              {content}
            </pre>
          )}
        </div>
      );
    }

    case "Edit": {
      const oldString = typeof input.old_string === "string" ? input.old_string : "";
      const newString = typeof input.new_string === "string" ? input.new_string : "";
      return (
        <EditDiffView
          oldString={oldString}
          newString={newString}
          filePath={path}
        />
      );
    }

    case "Grep": {
      const results = parseGrepResults(content);
      const pattern = typeof input.pattern === "string" ? input.pattern : "";
      return (
        <div className="flex flex-col gap-3">
          <div className="font-mono text-xs text-muted-foreground">
            Pattern: {pattern}
          </div>
          {results.map((r, i) => (
            <div key={i} className="rounded-md border border-border/50 bg-muted/30 px-3 py-2">
              <div className="mb-1">
                <FilePath path={r.file} />
              </div>
              <div className="font-mono text-[13px] text-foreground">
                {r.lines.map((line, j) => (
                  <div key={j}>{line}</div>
                ))}
              </div>
            </div>
          ))}
        </div>
      );
    }

    case "WebSearch": {
      const results = parseWebSearchResults(content);
      return (
        <div className="flex flex-col gap-2">
          {results.map((r, i) => (
            <div
              key={i}
              className="rounded-md border border-border/50 bg-muted/30 px-3 py-2"
            >
              {r.title && (
                <div className="font-medium text-sm text-foreground">{r.title}</div>
              )}
              {r.url && (
                <a
                  href={r.url}
                  className="text-xs text-accent-blue hover:underline cursor-pointer"
                  onClick={(e) => {
                    e.preventDefault();
                    void window.api.shell.openExternal(r.url!);
                  }}
                >
                  {r.url}
                </a>
              )}
              {r.snippet && (
                <div className="mt-1 text-xs text-muted-foreground">{r.snippet}</div>
              )}
            </div>
          ))}
        </div>
      );
    }

    case "WebFetch":
      return (
        <div className="max-h-64 overflow-auto rounded-md border border-border px-4 py-3">
          <div className="prose prose-sm dark:prose-invert max-w-none text-foreground">
            {content}
          </div>
        </div>
      );

    case "Glob": {
      const files = content.split("\n").filter(Boolean);
      return (
        <div className="flex flex-col gap-1">
          <div className="text-xs text-muted-foreground">
            {files.length} file{files.length !== 1 ? "s" : ""} found
          </div>
          <div className="max-h-48 overflow-auto flex flex-col">
            {files.map((f, i) => (
              <FilePath key={i} path={f} />
            ))}
          </div>
        </div>
      );
    }

    default:
      return (
        <div className="relative group/code">
          <CopyButton text={content} />
          <pre className="max-h-64 overflow-auto rounded-md bg-code-bg px-4 py-3 font-mono text-[13px] text-foreground">
            {content}
          </pre>
        </div>
      );
  }
}
