import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { useLiveSessionStore } from "~/stores/liveSession";
import { useSessionsStore } from "~/stores/sessions";
import { useSessionsService } from "~/services/sessions.service";
import { parseTurns } from "~/lib/parse-turns";
import { extractTouchedFiles } from "~/lib/extract-touched-files";
import type { TouchedFile } from "../../shared/types";

export function useTouchedFiles(): TouchedFile[] {
  const activeSessionId = useSessionsStore((s) => s.activeSessionId);
  const activeProjectPath = useSessionsStore((s) => s.activeProjectPath);

  const { getMessages } = useSessionsService();

  const { data: historyMessages } = useQuery({
    queryKey: ["sessionMessages", activeSessionId],
    queryFn: () => getMessages(activeSessionId!, activeProjectPath ?? undefined),
    enabled: Boolean(activeSessionId),
  });

  const activeRun = useLiveSessionStore((s) => {
    if (activeSessionId) {
      return (
        [...s.runningSessions.values()].find((r) => r.sessionId === activeSessionId) ?? null
      );
    }
    return [...s.runningSessions.values()].find((r) => r.sessionId === null) ?? null;
  });

  const allMessages = useMemo(() => {
    const liveMessages = activeRun?.messages ?? [];
    const history = historyMessages ?? [];
    return liveMessages.length > 0
      ? [...history, ...liveMessages]
      : history.length > 0
        ? history
        : liveMessages;
  }, [historyMessages, activeRun]);

  return useMemo(() => {
    const parentMessages = allMessages.filter(
      (m) => !(m as { parent_tool_use_id?: string | null }).parent_tool_use_id,
    );
    const turns = parseTurns(parentMessages);
    return extractTouchedFiles(turns);
  }, [allMessages]);
}
