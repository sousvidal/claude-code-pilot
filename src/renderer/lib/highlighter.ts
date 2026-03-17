import { createHighlighter, type Highlighter } from "shiki";

let highlighterPromise: Promise<Highlighter> | null = null;

const COMMON_LANGS = [
  "typescript",
  "javascript",
  "tsx",
  "jsx",
  "json",
  "html",
  "css",
  "python",
  "rust",
  "go",
  "bash",
  "shell",
  "yaml",
  "toml",
  "markdown",
  "sql",
  "graphql",
  "diff",
  "xml",
  "c",
  "cpp",
  "java",
  "ruby",
  "php",
  "swift",
  "kotlin",
];

export function getHighlighter(): Promise<Highlighter> {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighter({
      themes: ["github-dark", "github-light"],
      langs: COMMON_LANGS,
    });
  }
  return highlighterPromise;
}

const EXT_TO_LANG: Record<string, string> = {
  ts: "typescript",
  tsx: "tsx",
  js: "javascript",
  jsx: "jsx",
  json: "json",
  html: "html",
  css: "css",
  py: "python",
  rs: "rust",
  go: "go",
  sh: "bash",
  bash: "bash",
  zsh: "bash",
  yml: "yaml",
  yaml: "yaml",
  toml: "toml",
  md: "markdown",
  sql: "sql",
  graphql: "graphql",
  xml: "xml",
  c: "c",
  cpp: "cpp",
  h: "c",
  hpp: "cpp",
  java: "java",
  rb: "ruby",
  php: "php",
  swift: "swift",
  kt: "kotlin",
};

export function getLangFromPath(filePath: string): string {
  const ext = filePath.split(".").pop()?.toLowerCase() ?? "";
  return EXT_TO_LANG[ext] ?? "text";
}
