import { createFileRoute } from "@tanstack/react-router";
import { AccountForm } from "@/components/AccountForm";
export const Route = createFileRoute("/login")({
  component: () => <AccountForm key="login" mode="login" />,
});
