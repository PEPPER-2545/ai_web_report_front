import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';
import { Task } from './entities/task.entity';

@Module({
    // ระบุ 'ROBOT_CONNECTION' เพื่อให้ Task Entity ไปดึงข้อมูลจาก DB data_robot
    imports: [TypeOrmModule.forFeature([Task], 'ROBOT_CONNECTION')], 
    controllers: [TasksController],
    providers: [TasksService],
})
export class TasksModule { }