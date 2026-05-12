import {
    Controller,
    Get,
    Post,
    Patch,
    Delete,
    Body,
    Param,
    Query,
    UploadedFile,
    UseInterceptors,
    UseGuards, Res, NotFoundException
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ImagesService } from './images.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Response } from 'express';

@Controller('images')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ImagesController {
    constructor(private readonly imagesService: ImagesService) { }

    @Post()
    @UseInterceptors(FileInterceptor('image'))
    async create(
    @Body() body: { site: string; imageType: string; imageName: string; domain: string }, // [เพิ่ม] imageName
    @UploadedFile() file: Express.Multer.File,
) {
    // ส่ง imageName ไปให้ Service ด้วย
    return this.imagesService.create(body.site, body.imageType, body.imageName, body.domain, file);
}
    @Get()
  async findAll(@Query('domain') domain: string) {
    return this.imagesService.findAll(domain);
  }


   @Get(':id')
  async findOne(@Param('id') id: string) {
    // [แก้ไข] ลบเครื่องหมาย + ออก
    return this.imagesService.findOne(id); 
  }

  @Patch(':id')
  @UseInterceptors(FileInterceptor('image'))
  async update(
    @Param('id') id: string,
    @Body() updateData: { site?: string; imageType?: string },
    @UploadedFile() file: Express.Multer.File,
  ) {
    // [แก้ไข] ลบเครื่องหมาย + ออก
    return this.imagesService.update(id, updateData, file);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    // [แก้ไข] ลบเครื่องหมาย + ออก (ถ้ามี)
    await this.imagesService.delete(id);
    return { message: 'Image deleted successfully' };
  }
}
