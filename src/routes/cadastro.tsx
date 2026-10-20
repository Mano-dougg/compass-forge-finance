import { createFileRoute } from "@tanstack/react-router";
import { AccountForm } from "@/components/AccountForm";
export const Route = createFileRoute("/cadastro")({
  component: () => <AccountForm key="cadastro" mode="cadastro" />,
});
