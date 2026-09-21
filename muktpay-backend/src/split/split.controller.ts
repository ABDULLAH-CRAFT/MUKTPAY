import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { SplitPreviewDto } from './dto/split-preview.dto';
import { SplitService, type SplitPreview } from './split.service';

@Controller('split')
export class SplitController {
  constructor(private readonly split: SplitService) {}

  /** Shows how a bill would be paid. Creates nothing: orders are created in Phase 8. */
  @HttpCode(HttpStatus.OK)
  @Post('preview')
  preview(@Body() dto: SplitPreviewDto): SplitPreview {
    return this.split.preview(dto);
  }
}
