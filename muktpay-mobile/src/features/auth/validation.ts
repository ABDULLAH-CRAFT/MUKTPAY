// Client-side checks for instant feedback. The server enforces the same rules.
export const validateName = (value: string) =>
  value.trim().length < 2 ? 'Enter your name' : undefined;

export const validateEmail = (value: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()) ? undefined : 'Enter a valid email address';

export function validatePassword(value: string) {
  if (value.length < 8) return 'Use at least 8 characters';
  if (value.length > 72) return 'Use at most 72 characters';
  if (!/[A-Za-z]/.test(value)) return 'Include at least one letter';
  if (!/\d/.test(value)) return 'Include at least one number';
  return undefined;
}
