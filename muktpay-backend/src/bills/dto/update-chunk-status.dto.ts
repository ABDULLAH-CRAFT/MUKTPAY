import { IsIn } from 'class-validator';

export class UpdateChunkStatusDto {
  @IsIn(['pending', 'paid'])
  status!: 'pending' | 'paid';
}
