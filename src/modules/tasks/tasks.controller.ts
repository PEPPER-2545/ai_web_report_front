import { Controller, Get, Post, Body, Patch, Param, Delete, UseInterceptors, UploadedFile, UseGuards, Query } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
// import { RolesGuard } from '../auth/guards/roles.guard'; // เปิดใช้ถ้ามี

@Controller('tasks')
@UseGuards(JwtAuthGuard) // เปิด Guard ตามความเหมาะสม
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get()
  findAll(@Query('domain') domain: string) {
    return this.tasksService.findAll(domain);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.tasksService.findOne(id);
  }

  @Post()
  @UseInterceptors(FileInterceptor('image'))
  create(@Body() createTaskDto: CreateTaskDto, @UploadedFile() file: Express.Multer.File) {
    return this.tasksService.create(createTaskDto, file);
  }

  @Patch(':id')
  @UseInterceptors(FileInterceptor('image'))
  update(
    @Param('id') id: string,
    @Body() updateTaskDto: Partial<CreateTaskDto>,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.tasksService.update(id, updateTaskDto, file);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.tasksService.delete(id);
  }
}