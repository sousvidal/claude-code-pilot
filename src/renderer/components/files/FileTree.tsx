import type { FileTreeNode } from "../../../shared/types";

import { FileTreeNode as FileTreeNodeComponent } from "./FileTreeNode";

interface FileTreeProps {
  nodes: FileTreeNode[];
  depth: number;
}

export function FileTree({ nodes, depth }: FileTreeProps) {
  return (
    <div className="flex flex-col">
      {nodes.map((node) => (
        <FileTreeNodeComponent key={node.path} node={node} depth={depth} />
      ))}
    </div>
  );
}
