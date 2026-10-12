/**
 * Longest UPI ID the app accepts. Derived from the validation pattern in
 * merchant/dto/upsert-merchant-profile.dto.ts:
 *   name part 2-256 chars + "@" + handle (1 letter + 1-64 chars) = 256 + 1 + 65 = 322.
 * The DTO and the database columns BOTH use this constant, so valid input can never be
 * rejected by the database with a 500.
 */
export const VPA_MAX_LENGTH = 322;