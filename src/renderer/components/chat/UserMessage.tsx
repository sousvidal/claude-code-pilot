import type { TurnUserMessage } from "../../../shared/types";

interface UserMessageProps {
  message: TurnUserMessage;
}

export function UserMessage({ message }: UserMessageProps) {
  return (
    <div className="rounded-xl border border-border/50 border-l-2 border-l-accent-blue/40 bg-muted/60 px-4 py-3">
      <p className="text-sm text-foreground whitespace-pre-wrap">{message.text}</p>
      <p className="mt-2 text-right text-xs text-muted-foreground">
        {message.timestamp}
      </p>
    </div>
  );
}
