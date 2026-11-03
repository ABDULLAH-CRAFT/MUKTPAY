import { Transform } from 'class-transformer';
import { IsEmail, IsString, Matches, MaxLength, MinLength } from 'class-validator';

const normaliseEmail = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim().toLowerCase() : value);
const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

const CODE_RULE = /^\d{6}$/;
const CODE_MESSAGE = 'Enter the 6-digit code';

export class ForgotPasswordDto {
  @Transform(normaliseEmail)
  @IsEmail({}, { message: 'Enter a valid email address' })
  @MaxLength(255)
  email!: string;
}

export class ResetPasswordDto {
  @Transform(normaliseEmail)
  @IsEmail({}, { message: 'Enter a valid email address' })
  @MaxLength(255)
  email!: string;

  @Transform(trim)
  @IsString()
  @Matches(CODE_RULE, { message: CODE_MESSAGE })
  code!: string;

  // Same rules as registration. bcrypt only uses the first 72 bytes, so the length is capped.
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  @MaxLength(72)
  @Matches(/[A-Za-z]/, { message: 'Password must contain a letter' })
  @Matches(/\d/, { message: 'Password must contain a number' })
  newPassword!: string;
}

export class VerifyEmailDto {
  @Transform(trim)
  @IsString()
  @Matches(CODE_RULE, { message: CODE_MESSAGE })
  code!: string;
}

export class DeleteAccountDto {
  @IsString()
  @MinLength(1)
  @MaxLength(72)
  password!: string;
}
