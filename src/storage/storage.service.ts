import { Injectable, OnModuleInit, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Minio from 'minio';
import { Readable } from 'stream';

@Injectable()
export class StorageService implements OnModuleInit {
    private minioClient: Minio.Client;      // Client เดิม (Report)
    private robotMinioClient: Minio.Client; // Client ใหม่ (Robot)
    private bucket: string;
    private robotBucket: string;

    constructor(private readonly configService: ConfigService) { }

    onModuleInit() {
        // 1. Initialize Client เดิม (สำหรับ Report Web)
        this.bucket = this.configService.get('MINIO_BUCKET');
        this.minioClient = new Minio.Client({
            endPoint: this.configService.get('MINIO_ENDPOINT'),
            port: parseInt(this.configService.get('MINIO_PORT')),
            useSSL: this.configService.get('MINIO_USE_SSL') === 'true',
            accessKey: this.configService.get('MINIO_ACCESS_KEY'),
            secretKey: this.configService.get('MINIO_SECRET_KEY'),
        });

        // 2. Initialize Client ใหม่ (สำหรับ Robot Web)
        this.robotBucket = this.configService.get('MINIO_ROBOT_BUCKET');
        this.robotMinioClient = new Minio.Client({
            endPoint: this.configService.get('MINIO_ROBOT_ENDPOINT'),
            port: parseInt(this.configService.get('MINIO_ROBOT_PORT')),
            useSSL: this.configService.get('MINIO_ROBOT_USE_SSL') === 'true',
            accessKey: this.configService.get('MINIO_ROBOT_ACCESS_KEY'),
            secretKey: this.configService.get('MINIO_ROBOT_SECRET_KEY'),
        });
    }

    // --- ฟังก์ชันเดิม (สำหรับ Report Web / Default Bucket) ---

    async uploadFile(file: Express.Multer.File, fileName: string): Promise<string> {
        await this.minioClient.putObject(this.bucket, fileName, file.buffer, file.size, {
            'Content-Type': file.mimetype,
        });
        return fileName; // ส่งกลับเป็น Path (Report Web ใช้แบบนี้)
    }

    // [เพิ่มกลับมา] สำหรับดึง Presigned URL (แก้ error: getFileUrl)
    async getFileUrl(path: string): Promise<string> {
        // ถ้าเป็น Full URL อยู่แล้วให้ส่งกลับเลย
        if (path.startsWith('http')) return path;

        // ถ้าเป็น Path ให้สร้าง Presigned URL จาก Bucket หลัก
        return await this.minioClient.presignedGetObject(this.bucket, path, 24 * 60 * 60); // อายุ 1 วัน
    }

    // [เพิ่มกลับมา] สำหรับดาวน์โหลดไฟล์เป็น Stream (แก้ error: getFile)
    async getFile(path: string): Promise<Readable> {
        try {
            return await this.minioClient.getObject(this.bucket, path);
        } catch (error) {
            throw new InternalServerErrorException(`Could not retrieve file: ${error.message}`);
        }
    }

    // [เพิ่มกลับมา] สำหรับลิสต์รายการไฟล์ (แก้ error: listFiles)
    async listFiles(prefix: string = ''): Promise<any[]> {
        return new Promise((resolve, reject) => {
            const stream = this.minioClient.listObjectsV2(this.bucket, prefix, true);
            const files = [];
            stream.on('data', (obj) => files.push(obj));
            stream.on('end', () => resolve(files));
            stream.on('error', (err) => reject(err));
        });
    }

    // --- ฟังก์ชันใหม่ (สำหรับ Robot Web / Robot Bucket) ---

    async uploadRobotFile(file: Express.Multer.File, fileName: string): Promise<string> {
        // อัปโหลดไปที่ Robot Bucket
        await this.robotMinioClient.putObject(this.robotBucket, fileName, file.buffer, file.size, {
            'Content-Type': file.mimetype,
        });

        // ส่งกลับเป็น Full URL ตามสไตล์ Robot Web
        const endpoint = this.configService.get('MINIO_ROBOT_ENDPOINT');
        // ตรวจสอบว่าเป็น HTTPS หรือไม่เพื่อสร้าง URL ให้ถูกต้อง
        const protocol = this.configService.get('MINIO_ROBOT_USE_SSL') === 'true' ? 'https' : 'http';

        return `${protocol}://${endpoint}/${this.robotBucket}/${fileName}`;
    }

    async deleteRobotFile(fileName: string): Promise<void> {
        // ลบไฟล์จาก Robot Bucket
        await this.robotMinioClient.removeObject(this.robotBucket, fileName);
    }
}