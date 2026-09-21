import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';
/** Every route requires a valid access token unless marked @Public(). Secure by default. */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
