import { useState } from "react";
import {
  ChevronRight,
  File,
  FileCode,
  FileJson2,
  FileText,
  Folder,
  FolderOpen,
  Paintbrush,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import type { FileTreeNode as FileTreeNodeType } from "../../../shared/types";

import { useEditorStore } from "~/stores/editor";
import { cn } from "~/lib/utils";
import { useFilesService } from "~/services/files.service";
import { FileTree } from "./FileTree";

const INDENT_CLASSES = [
  "pl-0",
  "pl-4",
  "pl-8",
  "pl-12",
  "pl-16",
  "pl-20",
] as const;

function getFileIcon(extension?: string) {
  const ext = extension?.toLowerCase();
  switch (ext) {
    case ".ts":
    case ".tsx":
      return <FileCode className="h-4 w-4 shrink-0 text-accent-blue" />;
    case ".json":
      return <FileJson2 className="h-4 w-4 shrink-0 text-accent-amber" />;
    case ".md":
      return <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />;
    case ".css":
      return <Paintbrush className="h-4 w-4 shrink-0 text-accent-purple" />;
    case ".js":
    case ".jsx":
      return <FileCode className="h-4 w-4 shrink-0 text-accent-amber" />;
    default:
      return <File className="h-4 w-4 shrink-0 text-muted-foreground" />;
  }
}

interface FileTreeNodeProps {
  node: FileTreeNodeType;
  depth: number;
}

export function FileTreeNode({ node, depth }: FileTreeNodeProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { readDir } = useFilesService();
  const openFile = useEditorStore((s) => s.openFile);
  const activeFilePath = useEditorStore((s) => s.activeFilePath);

  const { data: children, isLoading } = useQuery({
    queryKey: ["files", "dir", node.path],
    queryFn: () => readDir(node.path),
    enabled: node.isDirectory && isExpanded,
  });

  const indentClass = INDENT_CLASSES[Math.min(depth, INDENT_CLASSES.length - 1)];

  const handleClick = () => {
    if (node.isDirectory) {
      setIsExpanded((prev) => !prev);
    }
  };

  if (node.isDirectory) {
    return (
      <div className={cn("flex flex-col", indentClass)}>
        <button
          type="button"
          onClick={handleClick}
          className={cn(
            "flex items-center gap-1.5 rounded-md px-2 py-1 text-sm transition-colors",
            "hover:bg-muted/50 cursor-pointer",
          )}
        >
          <ChevronRight
            className={cn(
              "h-4 w-4 shrink-0 transition-transform duration-150",
              isExpanded && "rotate-90",
            )}
          />
          {isExpanded ? (
            <FolderOpen className="h-4 w-4 shrink-0 text-accent-amber/70" />
          ) : (
            <Folder className="h-4 w-4 shrink-0 text-accent-amber/70" />
          )}
          <span className="truncate text-foreground">{node.name}</span>
        </button>
        {isExpanded && (
          <div className="flex flex-col">
            {isLoading ? (
              <div className="flex items-center gap-1.5 py-1 pl-4">
                <span className="text-xs text-muted-foreground">
                  Loading...
                </span>
              </div>
            ) : children && children.length > 0 ? (
              <FileTree nodes={children} depth={depth + 1} />
            ) : children && children.length === 0 ? (
              <div className="py-1 pl-4">
                <span className="text-xs text-muted-foreground">
                  Empty folder
                </span>
              </div>
            ) : null}
          </div>
        )}
      </div>
    );
  }

  const isActive = activeFilePath === node.path;

  return (
    <button
      type="button"
      onClick={() => openFile(node.path)}
      className={cn(
        "flex w-full items-center gap-1.5 rounded-md px-2 py-1 text-sm transition-colors",
        "hover:bg-muted/50 cursor-pointer",
        isActive && "bg-muted/70",
        indentClass,
      )}
    >
      {getFileIcon(node.extension)}
      <span className="truncate text-foreground">{node.name}</span>
    </button>
  );
}
