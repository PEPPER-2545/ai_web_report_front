import { Controller, Get, Post, Query, UploadedFile, UseInterceptors, Body } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { StorageService } from './storage.service';

@Controller('storage')
export class StorageController {
    constructor(private readonly storageService: StorageService) { }

    @Get('url')
    async getFileUrl(@Query('path') path: string) {
        const url = await this.storageService.getFileUrl(path);
        return { url };
    }

    // ⭐ ส่วนที่เพิ่ม: Endpoint สำหรับอัปโหลดไฟล์
    @Post('upload')
    @UseInterceptors(FileInterceptor('file')) // 'file' คือชื่อ field ใน FormData ที่ Frontend จะส่งมา
    async uploadFile(
        @UploadedFile() file: Express.Multer.File,
        @Body('domain') domain: string = 'default' // ใช้สำหรับจัดระเบียบไฟล์ใน MinIO
    ) {
        // file: Express.Multer.File ถูกส่งเข้ามาจาก FileInterceptor
        // เราส่งไฟล์นี้พร้อมกับ domain/folder ไปให้ service จัดการ
        const path = await this.storageService.uploadFile(file, domain);
        
        // คืน path ของไฟล์ใน MinIO กลับไปให้ Frontend เพื่อเก็บลง Database
        return { 
            message: 'File uploaded successfully',
            path: path
        }; 
    }

    // ในไฟล์ storage.controller.ts

    @Get('list')
    async listFiles(@Query('folder') folder: string) {
        // folder คือ prefix เช่นถ้าอยากดูแค่ในโฟลเดอร์ uploads ก็ส่ง ?folder=uploads/ มา
        // ถ้าไม่ส่งจะดึงมาทั้งหมด
        const files = await this.storageService.listFiles(folder || '');
        return { 
            count: files.length,
            files: files 
        };
    }
}