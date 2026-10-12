import axios from 'axios';
import { classifyError } from './errorKind';

/** Turns any thrown error into a sentence that is safe to show a user. */
export function getApiErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const kind = classifyError(error);

    if (kind === 'network') {
      return error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT'
        ? 'The server is taking too long to respond. Please try again.'
        : "Can't reach the server. Check your connection and try again.";
    }

    // Never show server-supplied text for 5xx: it can contain internals.
    if (kind === 'server') return 'MuktPay is having a problem right now. Please try again in a moment.';

    const status = error.response?.status;
    if (status === 429) return 'Too many attempts. Please wait a minute and try again.';

    const message = error.response?.data?.message;
    if (Array.isArray(message) && message.length > 0) return String(message[0]);
    if (typeof message === 'string' && message) return message;

    if (kind === 'auth') return 'Your session has expired. Please log in again.';
    if (status === 403) return "You don't have permission to do that.";
    if (status === 404) return "We couldn't find that.";
  }
  return 'Something went wrong. Please try again.';
}