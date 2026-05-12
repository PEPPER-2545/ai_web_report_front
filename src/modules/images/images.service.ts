import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RobotImage } from './entities/robot-image.entity';
import { StorageService } from '../../storage/storage.service';
import { randomUUID } from 'crypto';
import * as path from 'path';

@Injectable()
export class ImagesService {
    constructor(
        @InjectRepository(RobotImage, 'ROBOT_CONNECTION')
        private readonly imagesRepository: Repository<RobotImage>,
        private readonly storageService: StorageService,
    ) { }

    async findAll(domain: string) {
        return this.imagesRepository.find({
            order: { createdAt: 'DESC' },
        });
    }

    // [แก้ 1] เปลี่ยน id: number เป็น id: string
    async findOne(id: string) {
        // [แก้ 1] ลบการแปลง Number() ออก (ถ้ามี)
        const image = await this.imagesRepository.findOne({ where: { id } });
        if (!image) throw new NotFoundException('Image not found');
        return image;
    }

    async create(site: string, imageType: string, imageName: string, domain: string, file: Express.Multer.File) {
        const uuid = randomUUID();
        const fileExt = path.extname(file.originalname);
        const fileName = `operation_eqn/${uuid}${fileExt}`;

        const imageUrl = await this.storageService.uploadRobotFile(file, fileName);

        const newImage = this.imagesRepository.create({
            site,
            imageType,
            imageUrl: imageUrl,
            imageName: imageName || file.originalname,
            // [แก้ 2] กำหนดค่า createdAt เองเลย เพื่อแก้ปัญหา DB ไม่ยอมรับค่า Default
            createdAt: new Date(),
        });
        return this.imagesRepository.save(newImage);
    }

    // [แก้ 1] เปลี่ยน id: number เป็น id: string
    async update(id: string, updateData: { site?: string; imageType?: string }, file?: Express.Multer.File) {
        const image = await this.findOne(id);

        if (file) {
            const uuid = randomUUID();
            const fileExt = path.extname(file.originalname);
            const fileName = `operation_eqn/${uuid}${fileExt}`;
            image.imageUrl = await this.storageService.uploadRobotFile(file, fileName);
        }

        Object.assign(image, updateData);
        return this.imagesRepository.save(image);
    }



    // [แก้ 1] เปลี่ยน id: number เป็น id: string
    async delete(id: string) {
        const image = await this.findOne(id);

        try {
            if (image.imageUrl && image.imageUrl.includes('operation_eqn')) {
                // ดึงชื่อไฟล์จาก URL (เช่น http://.../operation_eqn/uuid.jpg -> operation_eqn/uuid.jpg)
                const urlParts = image.imageUrl.split('/');
                const fileName = `operation_eqn/${urlParts[urlParts.length - 1]}`;
                await this.storageService.deleteRobotFile(fileName);
            }
        } catch (error) {
            console.error('Failed to delete file from MinIO:', error);
            // ไม่ throw error เพื่อให้ลบใน DB ต่อได้ (หรือจะ throw ก็ได้แล้วแต่ Requirement)
        }

        return this.imagesRepository.remove(image);
    }
}