/** Shown whenever we can't give a more specific reason. */
export const GENERIC_ERROR_MESSAGE = "Something went wrong. Please try again.";

/** An error whose message is safe to show on screen. */
export class AuthError extends Error {}
export class BookingError extends Error {}

/** Turns anything caught in a try/catch into text that's safe to show. */
export function errorMessage(err: unknown): string {
  return err instanceof AuthError || err instanceof BookingError ? err.message : GENERIC_ERROR_MESSAGE;
}

export function fail(error: {message?:string } | null): never{
  throw new BookingError(error?.message || GENERIC_ERROR_MESSAGE);
}
