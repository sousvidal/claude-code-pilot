import { Toaster } from "sonner";

import { AppLayout } from "~/components/layouts/AppLayout";

export function App() {
  return (
    <>
      <AppLayout />
      <Toaster
        theme="dark"
        position="bottom-right"
        toastOptions={{
          className: "bg-card border-border text-foreground",
        }}
      />
    </>
  );
}
