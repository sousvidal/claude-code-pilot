import { Toaster } from "sonner";

import { ErrorBoundary } from "~/components/ui/error-boundary";
import { AppLayout } from "~/components/layouts/AppLayout";

export function App() {
  return (
    <ErrorBoundary fallbackMessage="The application encountered an error">
      <AppLayout />
      <Toaster
        theme="dark"
        position="bottom-right"
        toastOptions={{
          className: "bg-card border-border text-foreground",
        }}
      />
    </ErrorBoundary>
  );
}
