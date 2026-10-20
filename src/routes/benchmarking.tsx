import { createFileRoute, redirect } from "@tanstack/react-router";

// Keep existing bookmarks working after merging market comparison into the diagnosis.
export const Route = createFileRoute("/benchmarking")({
  beforeLoad: () => {
    throw redirect({ to: "/", hash: "mercado", replace: true });
  },
});
