import { useEffect, useState } from "react";

import { getHighlighter, getLangFromPath } from "~/lib/highlighter";
import { cn } from "~/lib/utils";

interface CodeHighlightProps {
  code: string;
  lang?: string;
  filePath?: string;
  maxHeight?: string;
  className?: string;
}

export function CodeHighlight({
  code,
  lang,
  filePath,
  maxHeight = "max-h-64",
  className,
}: CodeHighlightProps) {
  const [html, setHtml] = useState<string | null>(null);
  const resolvedLang = lang ?? (filePath ? getLangFromPath(filePath) : "text");

  useEffect(() => {
    let cancelled = false;
    getHighlighter().then((h) => {
      if (cancelled) return;
      const result = h.codeToHtml(code, {
        lang: resolvedLang,
        theme: "github-dark",
      });
      setHtml(result);
    });
    return () => {
      cancelled = true;
    };
  }, [code, resolvedLang]);

  if (!html) {
    return (
      <pre
        className={cn(
          "overflow-auto rounded-md bg-code-bg px-4 py-3 font-mono text-[13px] text-foreground",
          maxHeight,
          className,
        )}
      >
        {code}
      </pre>
    );
  }

  return (
    <div
      className={cn(
        "overflow-auto rounded-md [&_pre]:!bg-code-bg [&_pre]:px-4 [&_pre]:py-3 [&_pre]:font-mono [&_pre]:text-[13px]",
        maxHeight,
        className,
      )}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
