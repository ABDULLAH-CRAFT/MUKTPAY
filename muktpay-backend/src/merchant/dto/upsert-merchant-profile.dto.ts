import { IsOptional, IsString, Length, Matches, MaxLength } from 'class-validator';

// Same shape muktpay-mobile/src/services/upi/upiValidator.ts checks a scanned VPA against — a
// merchant's own UPI ID must be one the app would also accept from a QR code, not two definitions
// of "valid" that can drift apart.
const VPA = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z][a-zA-Z0-9.\-_]{1,64}$/;

export class UpsertMerchantProfileDto {
  @IsString()
  @Length(2, 50)
  shopName!: string;

  @IsString()
  @Matches(VPA, { message: 'Enter a valid UPI ID, like shop@ybl' })
  vpa!: string;

  /** Client-computed hint ("Google Pay · HDFC Bank") from the handle. Informational only. */
  @IsOptional()
  @IsString()
  @MaxLength(120)
  issuerLabel?: string | null;
}
