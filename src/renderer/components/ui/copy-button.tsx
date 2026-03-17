import { useState } from "react";
import { Check, Copy } from "lucide-react";

import { cn } from "~/lib/utils";

interface CopyButtonProps {
  text: string;
  className?: string;
}

export function CopyButton({ text, className }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <button
      onClick={handleCopy}
      className={cn(
        "absolute right-2 top-2 z-10 rounded-md p-1.5 text-muted-foreground",
        "opacity-0 transition-opacity group-hover/code:opacity-100",
        "hover:bg-muted hover:text-foreground",
        className,
      )}
    >
      {copied ? (
        <Check className="h-3.5 w-3.5 text-green-500" />
      ) : (
        <Copy className="h-3.5 w-3.5" />
      )}
    </button>
  );
}
