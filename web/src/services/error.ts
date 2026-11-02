
export const GENERIC_ERROR_MESSAGE = "Something went wrong. Please try again.";


export class AuthError extends Error {}
export class BookingError extends Error {}


export function errorMessage(err: unknown): string {
  return err instanceof AuthError || err instanceof BookingError ? err.message : GENERIC_ERROR_MESSAGE;
}

export function fail(error: {message?:string } | null): never{
  throw new BookingError(error?.message || GENERIC_ERROR_MESSAGE);
}


export async function failFromFunction(error: unknown): Promise<never> {
  const response = (error as { context?: unknown } | null)?.context;
  const body = response instanceof Response
    ? ((await response.json().catch(() => null)) as { error?: string } | null)
    : null;
  fail({ message: body?.error });
}
