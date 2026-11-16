import { createFileRoute, redirect } from "@tanstack/react-router";

// Keep previous market-analysis bookmarks pointing to the detailed analysis.
export const Route = createFileRoute("/benchmarking")({
  beforeLoad: () => {
    throw redirect({ to: "/analise-detalhada", hash: "mercado", replace: true });
  },
});
