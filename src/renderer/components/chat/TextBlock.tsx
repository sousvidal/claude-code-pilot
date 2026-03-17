import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { cn } from "~/lib/utils";
import { CopyButton } from "~/components/ui/copy-button";
import { CodeHighlight } from "./CodeHighlight";

interface TextBlockProps {
  text: string;
}

export function TextBlock({ text }: TextBlockProps) {
  return (
    <div className="text-sm text-foreground leading-relaxed [&_p]:mb-2 [&_p:last-child]:mb-0 [&_ul]:list-disc [&_ul]:ml-4 [&_ol]:list-decimal [&_ol]:ml-4 [&_li]:my-0.5 [&_h1]:text-lg [&_h2]:text-base [&_h3]:text-sm [&_h1]:font-semibold [&_h2]:font-semibold [&_h3]:font-semibold [&_h1]:mt-4 [&_h2]:mt-3 [&_h3]:mt-2 [&_h1]:mb-2 [&_h2]:mb-1.5 [&_h3]:mb-1">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code: ({ className, children }) => {
            const langMatch = className?.match(/language-(\w+)/);
            if (langMatch) {
              const code = String(children).replace(/\n$/, "");
              return (
                <div className="relative my-2 group/code">
                  <CopyButton text={code} />
                  <CodeHighlight code={code} lang={langMatch[1]} />
                </div>
              );
            }
            return (
              <code className={cn("bg-muted rounded px-1.5 py-0.5 font-mono text-[13px]")}>
                {children}
              </code>
            );
          },
          a: ({ href, children, ...props }) => (
            <a
              href={href}
              className="text-accent-blue hover:underline cursor-pointer"
              onClick={(e) => {
                if (href) {
                  e.preventDefault();
                  void window.api.shell.openExternal(href);
                }
              }}
              {...props}
            >
              {children}
            </a>
          ),
          table: ({ children, ...props }) => (
            <div className="overflow-x-auto my-3">
              <table className="border-collapse w-full text-sm" {...props}>
                {children}
              </table>
            </div>
          ),
          thead: ({ children, ...props }) => (
            <thead className="bg-muted" {...props}>
              {children}
            </thead>
          ),
          tr: ({ children, ...props }) => (
            <tr className="even:bg-muted/40" {...props}>
              {children}
            </tr>
          ),
          th: ({ children, ...props }) => (
            <th
              className="border border-border px-3 py-2 text-left font-semibold"
              {...props}
            >
              {children}
            </th>
          ),
          td: ({ children, ...props }) => (
            <td className="border border-border px-3 py-2" {...props}>
              {children}
            </td>
          ),
          blockquote: ({ children, ...props }) => (
            <blockquote
              className="border-l-4 border-border pl-4 my-2 text-muted-foreground italic"
              {...props}
            >
              {children}
            </blockquote>
          ),
          hr: ({ ...props }) => (
            <hr className="border-border my-4" {...props} />
          ),
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}
