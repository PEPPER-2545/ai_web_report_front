import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ImagesController } from './images.controller';
import { ImagesService } from './images.service';
import { RobotImage } from './entities/robot-image.entity';

@Module({
    // ระบุ 'ROBOT_CONNECTION' เพื่อให้ RobotImage Entity ไปดึงข้อมูลจาก DB data_robot
    imports: [TypeOrmModule.forFeature([RobotImage], 'ROBOT_CONNECTION')],
    controllers: [ImagesController],
    providers: [ImagesService],
})
export class ImagesModule { }
