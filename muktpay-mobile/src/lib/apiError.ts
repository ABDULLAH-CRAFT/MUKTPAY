import axios from 'axios';

/** Turns any thrown error into a sentence that is safe to show a user. */
export function getApiErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    if (!error.response) return "Can't reach the server. Check your connection and try again.";
    if (error.response.status === 429) return 'Too many attempts. Please wait a minute and try again.';

    const message = error.response.data?.message;
    if (Array.isArray(message) && message.length > 0) return String(message[0]);
    if (typeof message === 'string' && message) return message;
  }
  return 'Something went wrong. Please try again.';
}
