import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Task } from './entities/task.entity';
import { CreateTaskDto } from './dto/create-task.dto';
import { StorageService } from '../../storage/storage.service';
import { ConfigService } from '@nestjs/config';
import * as path from 'path';

@Injectable()
export class TasksService {
    constructor(
        @InjectRepository(Task, 'ROBOT_CONNECTION')
        private readonly tasksRepository: Repository<Task>,
        private readonly storageService: StorageService,
        private readonly configService: ConfigService,
    ) { }

    async findAll(domain: string) {
        return this.tasksRepository.find();
    }

    async findOne(id: string) {
        const task = await this.tasksRepository.findOne({ where: { task_id: id } });
        if (!task) throw new NotFoundException('Task not found');
        return task;
    }

    async create(createTaskDto: CreateTaskDto, file: Express.Multer.File) {
        let fullUrl = '';

        if (file) {
            const fileExt = path.extname(file.originalname);
            // ตั้งชื่อไฟล์ตาม robot-web: task_image/{task_id}.ext
            const fileName = `task_image/${createTaskDto.taskId}${fileExt}`;

            // อัปโหลดไปที่ Robot Bucket และรับ URL เต็มกลับมา
            fullUrl = await this.storageService.uploadRobotFile(file, fileName);
        }

        const task = this.tasksRepository.create({
            task_id: createTaskDto.taskId,
            task_name: createTaskDto.taskName,
            map_name: createTaskDto.mapName,
            mode: createTaskDto.mode,
            purpose: createTaskDto.purpose,
            siteName: createTaskDto.siteName,
            imageUrl: fullUrl, // บันทึก URL เต็ม (https://...)
        });

        return this.tasksRepository.save(task);
    }

    async update(id: string, updateData: Partial<CreateTaskDto>, file?: Express.Multer.File) {
        const task = await this.findOne(id);

        if (file) {
            const fileExt = path.extname(file.originalname);
            const fileName = `task_image/${task.task_id}${fileExt}`;
            task.imageUrl = await this.storageService.uploadRobotFile(file, fileName);
        }

        if (updateData.taskName) task.task_name = updateData.taskName;
        if (updateData.mapName) task.map_name = updateData.mapName;
        if (updateData.mode) task.mode = updateData.mode;
        if (updateData.purpose) task.purpose = updateData.purpose;
        if (updateData.siteName) task.siteName = updateData.siteName;

        return this.tasksRepository.save(task);
    }

    async delete(id: string) {
        const task = await this.findOne(id);

        try {
            if (task.imageUrl && task.imageUrl.includes('task_image')) {
                // Extract filename from URL
                const urlParts = task.imageUrl.split('/');
                const fileName = `task_image/${urlParts[urlParts.length - 1]}`;
                await this.storageService.deleteRobotFile(fileName);
            }
        } catch (error) {
            console.error('Failed to delete file from MinIO:', error);
        }

        return this.tasksRepository.remove(task);
    }
}