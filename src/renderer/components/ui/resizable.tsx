import * as React from "react";
import {
  Panel,
  PanelGroup,
  PanelResizeHandle,
  type PanelProps,
} from "react-resizable-panels";

import { cn } from "~/lib/utils";

const ResizablePanelGroup = ({
  className,
  ...props
}: React.ComponentProps<typeof PanelGroup>) => (
  <PanelGroup
    className={cn("flex h-full w-full data-[panel-group-direction=vertical]:flex-col", className)}
    {...props}
  />
);

const ResizablePanel = React.forwardRef<
  React.ComponentRef<typeof Panel>,
  PanelProps
>(({ className, ...props }, ref) => (
  <Panel
    ref={ref}
    className={cn(className)}
    {...props}
  />
));
ResizablePanel.displayName = "ResizablePanel";

const ResizableHandle = ({
  className,
  ...props
}: React.ComponentProps<typeof PanelResizeHandle>) => (
  <PanelResizeHandle
    className={cn(
      "relative flex w-px items-center justify-center bg-border after:absolute after:inset-y-0 after:left-1/2 after:w-1 after:-translate-x-1/2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1 data-[panel-group-direction=vertical]:h-px data-[panel-group-direction=vertical]:w-full data-[panel-group-direction=vertical]:after:left-0 data-[panel-group-direction=vertical]:after:h-1 data-[panel-group-direction=vertical]:after:w-full data-[panel-group-direction=vertical]:after:-translate-y-1/2 data-[panel-group-direction=vertical]:after:translate-x-0 [&[data-panel-group-direction=vertical]>div]:rotate-0",
      className
    )}
    {...props}
  >
    <div className="z-10 flex h-4 w-3 items-center justify-center rounded-sm border bg-border">
      <div className="flex flex-col gap-0.5">
        <div className="h-0.5 w-1 rounded-full bg-muted-foreground/50" />
        <div className="h-0.5 w-1 rounded-full bg-muted-foreground/50" />
        <div className="h-0.5 w-1 rounded-full bg-muted-foreground/50" />
      </div>
    </div>
  </PanelResizeHandle>
);

export { ResizablePanelGroup, ResizablePanel, ResizableHandle };
