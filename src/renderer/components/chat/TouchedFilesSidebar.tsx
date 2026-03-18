import { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  File,
  Folder,
  FolderOpen,
  PanelRightClose,
} from "lucide-react";

import { useSessionsStore } from "~/stores/sessions";
import { useUIStore } from "~/stores/ui";
import { useTouchedFiles } from "~/lib/use-touched-files";
import { cn } from "~/lib/utils";
import { ScrollArea } from "~/components/ui/scroll-area";
import { Button } from "~/components/ui/button";
import type { TouchedFile, FileOperation } from "../../../shared/types";

// ---------------------------------------------------------------------------
// Tree builder
// ---------------------------------------------------------------------------

interface TreeNode {
  name: string;
  children: Map<string, TreeNode>;
  file: TouchedFile | null;
}

function buildTree(files: TouchedFile[], rootPath: string | null): TreeNode {
  const root: TreeNode = { name: "", children: new Map(), file: null };

  for (const file of files) {
    const normalizedRoot = rootPath
      ? rootPath.endsWith("/")
        ? rootPath
        : `${rootPath}/`
      : null;

    const relativePath =
      normalizedRoot && file.path.startsWith(normalizedRoot)
        ? file.path.slice(normalizedRoot.length)
        : file.path;

    const parts = relativePath.split("/").filter(Boolean);
    let node = root;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isLast = i === parts.length - 1;

      if (!node.children.has(part)) {
        node.children.set(part, {
          name: part,
          children: new Map(),
          file: isLast ? file : null,
        });
      } else if (isLast) {
        node.children.get(part)!.file = file;
      }

      node = node.children.get(part)!;
    }
  }

  return root;
}

// ---------------------------------------------------------------------------
// Operation badge
// ---------------------------------------------------------------------------

const OPERATION_STYLE: Record<
  FileOperation,
  { label: string; nameClass: string; badgeClass: string }
> = {
  created: {
    label: "A",
    nameClass: "text-green-500",
    badgeClass: "text-green-500",
  },
  modified: {
    label: "M",
    nameClass: "text-amber-500",
    badgeClass: "text-amber-500",
  },
  deleted: {
    label: "D",
    nameClass: "text-red-500 line-through opacity-60",
    badgeClass: "text-red-500",
  },
};

// ---------------------------------------------------------------------------
// Tree nodes
// ---------------------------------------------------------------------------

interface FileRowProps {
  file: TouchedFile;
  isActive: boolean;
  onClick: () => void;
}

function FileRow({ file, isActive, onClick }: FileRowProps) {
  const style = OPERATION_STYLE[file.operation];
  const name = file.path.split("/").pop() ?? file.path;

  return (
    <button
      className={cn(
        "flex w-full cursor-pointer items-center justify-between gap-2 rounded px-2 py-0.5 text-sm hover:bg-muted/50",
        isActive && "bg-muted",
      )}
      onClick={onClick}
    >
      <div className="flex min-w-0 items-center gap-1.5">
        <File className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <span className={cn("truncate", style.nameClass)}>{name}</span>
      </div>
      <span className={cn("shrink-0 text-xs font-medium", style.badgeClass)}>{style.label}</span>
    </button>
  );
}

interface TreeNodeRowProps {
  name: string;
  node: TreeNode;
  depth: number;
  activeFilePath: string | null;
  onFileClick: (path: string) => void;
}

function TreeNodeRow({ name, node, depth, activeFilePath, onFileClick }: TreeNodeRowProps) {
  const [open, setOpen] = useState(true);
  const isLeafFile = node.file !== null && node.children.size === 0;

  if (isLeafFile) {
    return (
      <FileRow
        file={node.file!}
        isActive={activeFilePath === node.file!.path}
        onClick={() => onFileClick(node.file!.path)}
      />
    );
  }

  const childEntries = Array.from(node.children.entries()).sort(
    ([aName, aNode], [bName, bNode]) => {
      const aIsLeaf = aNode.children.size === 0 && aNode.file !== null;
      const bIsLeaf = bNode.children.size === 0 && bNode.file !== null;
      if (aIsLeaf !== bIsLeaf) return aIsLeaf ? 1 : -1;
      return aName.localeCompare(bName);
    },
  );

  if (depth === 0) {
    return (
      <div>
        {childEntries.map(([childName, childNode]) => (
          <TreeNodeRow
            key={childName}
            name={childName}
            node={childNode}
            depth={depth + 1}
            activeFilePath={activeFilePath}
            onFileClick={onFileClick}
          />
        ))}
      </div>
    );
  }

  return (
    <div>
      <button
        className="flex w-full items-center gap-1.5 rounded px-2 py-0.5 text-sm hover:bg-muted/50"
        onClick={() => setOpen((o) => !o)}
      >
        {open ? (
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        )}
        {open ? (
          <FolderOpen className="h-3.5 w-3.5 shrink-0 text-blue-400" />
        ) : (
          <Folder className="h-3.5 w-3.5 shrink-0 text-blue-400" />
        )}
        <span className="truncate text-foreground">{name}</span>
      </button>
      {open && (
        <div className="pl-5">
          {childEntries.map(([childName, childNode]) => (
            <TreeNodeRow
              key={childName}
              name={childName}
              node={childNode}
              depth={depth + 1}
              activeFilePath={activeFilePath}
              onFileClick={onFileClick}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sidebar
// ---------------------------------------------------------------------------

export function TouchedFilesSidebar() {
  const activeProjectPath = useSessionsStore((s) => s.activeProjectPath);
  const toggleTouchedFilesSidebar = useUIStore((s) => s.toggleTouchedFilesSidebar);
  const openEditorFilePath = useUIStore((s) => s.openEditorFilePath);
  const setOpenEditorFile = useUIStore((s) => s.setOpenEditorFile);

  const touchedFiles = useTouchedFiles();
  const tree = buildTree(touchedFiles, activeProjectPath);

  return (
    <div className="flex h-full flex-col border-l border-border">
      <div className="flex h-10 shrink-0 items-center justify-between border-b border-border px-3">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Files
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={toggleTouchedFilesSidebar}
        >
          <PanelRightClose className="h-3.5 w-3.5" />
        </Button>
      </div>
      <ScrollArea className="flex-1 px-1 py-2">
        <TreeNodeRow
          name=""
          node={tree}
          depth={0}
          activeFilePath={openEditorFilePath}
          onFileClick={setOpenEditorFile}
        />
      </ScrollArea>
    </div>
  );
}
