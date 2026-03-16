import { Brain, ChevronRight } from "lucide-react";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "~/components/ui/collapsible";

interface ThinkingBlockProps {
  thinking: string;
}

export function ThinkingBlock({ thinking }: ThinkingBlockProps) {
  return (
    <Collapsible defaultOpen={false} className="group">
      <CollapsibleTrigger className="flex w-full items-center gap-2 py-1 text-left">
        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-90" />
        <Brain className="h-4 w-4 shrink-0 text-muted-foreground" />
        <span className="italic text-sm text-muted-foreground">Thinking...</span>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="mt-2 max-h-64 overflow-y-auto rounded-lg border border-border/30 bg-muted/30 px-4 py-3 font-mono text-[13px] text-muted-foreground whitespace-pre-wrap">
          {thinking}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
