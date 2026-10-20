export class AccountError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}
export async function accountRequest<T>(
  path: string,
  method = "GET",
  payload?: unknown,
  accountId?: string,
  signal?: AbortSignal,
): Promise<T> {
  const response = await fetch(`/api/${path}`, {
    method,
    ...(signal ? { signal } : {}),
    credentials: "same-origin",
    cache: "no-store",
    ...(payload !== undefined
      ? {
          headers: {
            "Content-Type": "application/json",
            ...(accountId ? { "X-Atlas-Account": accountId } : {}),
          },
          body: JSON.stringify(payload),
        }
      : {}),
  });
  let result;
  try {
    result = await response.json();
  } catch {
    throw new AccountError(
      response.status,
      "O servidor não respondeu corretamente. Tente novamente.",
    );
  }
  if (!response.ok)
    throw new AccountError(
      response.status,
      result.error || "Não foi possível concluir a operação.",
    );
  return result as T;
}
