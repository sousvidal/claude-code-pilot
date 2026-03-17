import { useMemo, useState } from "react";
import { diffLines, type Change } from "diff";

import { cn } from "~/lib/utils";

interface EditDiffViewProps {
  oldString: string;
  newString: string;
  filePath?: string;
}

interface DiffLine {
  type: "add" | "remove" | "context";
  content: string;
  oldNum?: number;
  newNum?: number;
}

const CONTEXT_LINES = 3;
const COLLAPSE_THRESHOLD = CONTEXT_LINES * 2 + 1;

function buildDiffLines(changes: Change[]): DiffLine[] {
  const lines: DiffLine[] = [];
  let oldNum = 1;
  let newNum = 1;

  for (const change of changes) {
    const rawLines = change.value.replace(/\n$/, "").split("\n");
    for (const line of rawLines) {
      if (change.added) {
        lines.push({ type: "add", content: line, newNum });
        newNum++;
      } else if (change.removed) {
        lines.push({ type: "remove", content: line, oldNum });
        oldNum++;
      } else {
        lines.push({ type: "context", content: line, oldNum, newNum });
        oldNum++;
        newNum++;
      }
    }
  }

  return lines;
}

interface CollapsedRegion {
  startIdx: number;
  endIdx: number;
  count: number;
}

function computeRegions(
  lines: DiffLine[],
): Array<{ type: "lines"; startIdx: number; endIdx: number } | { type: "collapsed"; region: CollapsedRegion }> {
  const changed = new Set<number>();
  lines.forEach((l, i) => {
    if (l.type !== "context") changed.add(i);
  });

  const visible = new Set<number>();
  for (const idx of changed) {
    for (let d = -CONTEXT_LINES; d <= CONTEXT_LINES; d++) {
      const target = idx + d;
      if (target >= 0 && target < lines.length) visible.add(target);
    }
  }

  if (changed.size === 0) {
    if (lines.length > COLLAPSE_THRESHOLD) {
      return [{ type: "collapsed", region: { startIdx: 0, endIdx: lines.length - 1, count: lines.length } }];
    }
    return [{ type: "lines", startIdx: 0, endIdx: lines.length - 1 }];
  }

  const regions: Array<
    { type: "lines"; startIdx: number; endIdx: number } | { type: "collapsed"; region: CollapsedRegion }
  > = [];
  let i = 0;
  while (i < lines.length) {
    if (visible.has(i)) {
      const start = i;
      while (i < lines.length && visible.has(i)) i++;
      regions.push({ type: "lines", startIdx: start, endIdx: i - 1 });
    } else {
      const start = i;
      while (i < lines.length && !visible.has(i)) i++;
      regions.push({ type: "collapsed", region: { startIdx: start, endIdx: i - 1, count: i - start } });
    }
  }

  return regions;
}

export function EditDiffView({ oldString, newString, filePath }: EditDiffViewProps) {
  const changes = useMemo(() => diffLines(oldString, newString), [oldString, newString]);
  const allLines = useMemo(() => buildDiffLines(changes), [changes]);
  const initialRegions = useMemo(() => computeRegions(allLines), [allLines]);

  const [expandedRegions, setExpandedRegions] = useState<Set<number>>(new Set());

  const addedCount = allLines.filter((l) => l.type === "add").length;
  const removedCount = allLines.filter((l) => l.type === "remove").length;

  const toggleRegion = (regionIdx: number) => {
    setExpandedRegions((prev) => {
      const next = new Set(prev);
      if (next.has(regionIdx)) next.delete(regionIdx);
      else next.add(regionIdx);
      return next;
    });
  };

  const gutterWidth = String(Math.max(allLines.length, 1)).length;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2 text-xs">
        {filePath && (
          <span className="font-mono text-muted-foreground">{filePath}</span>
        )}
        <span className="font-mono text-green-500">+{addedCount}</span>
        <span className="font-mono text-red-500">-{removedCount}</span>
      </div>

      <div className="max-h-96 overflow-auto rounded-md border border-border bg-code-bg font-mono text-[13px]">
        {initialRegions.map((region, regionIdx) => {
          if (region.type === "collapsed" && !expandedRegions.has(regionIdx)) {
            return (
              <button
                key={regionIdx}
                onClick={() => toggleRegion(regionIdx)}
                className="w-full bg-muted/40 px-4 py-1 text-center text-xs text-muted-foreground hover:bg-muted/60 transition-colors border-y border-border/30"
              >
                {region.region.count} unchanged line{region.region.count !== 1 ? "s" : ""}
              </button>
            );
          }

          const startIdx = region.type === "collapsed" ? region.region.startIdx : region.startIdx;
          const endIdx = region.type === "collapsed" ? region.region.endIdx : region.endIdx;
          const regionLines = allLines.slice(startIdx, endIdx + 1);

          return (
            <div key={regionIdx}>
              {regionLines.map((line, i) => (
                <div
                  key={startIdx + i}
                  className={cn(
                    "flex",
                    line.type === "add" && "bg-green-500/10",
                    line.type === "remove" && "bg-red-500/10",
                  )}
                >
                  <span
                    className={cn(
                      "shrink-0 select-none px-2 text-right text-muted-foreground/50",
                    )}
                    style={{ minWidth: `${gutterWidth + 2}ch` }}
                  >
                    {line.type === "add" ? "+" : line.type === "remove" ? "-" : " "}
                  </span>
                  <span
                    className={cn(
                      "flex-1 whitespace-pre-wrap break-all px-2",
                      line.type === "add" && "text-green-400",
                      line.type === "remove" && "text-red-400",
                      line.type === "context" && "text-foreground",
                    )}
                  >
                    {line.content}
                  </span>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
