import { Controller, Get, Post, Put, Delete, Body, Param, Res, HttpStatus, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { RobotsService } from './robots.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
// import { RolesGuard } from '../auth/guards/roles.guard'; // เปิดใช้ถ้าต้องการตรวจสอบสิทธิ์

@Controller('robots')
@UseGuards(JwtAuthGuard)
export class RobotsController {
    constructor(private readonly robotsService: RobotsService) {}

    @Get()
    async findAll(@Res() res: Response) {
        try {
            const robots = await this.robotsService.findAll();
            // คืนค่ารูปแบบ { robots: [...] } เพื่อให้เหมือนกับ backend เดิม
            return res.status(HttpStatus.OK).json({ robots });
        } catch (error) {
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error: 'Failed to fetch robots' });
        }
    }

    @Post()
    async create(@Body() body: any, @Res() res: Response) {
        try {
            const robot = await this.robotsService.create(body);
            return res.status(HttpStatus.CREATED).json({ robot });
        } catch (error) {
            if (error.message.includes('exists')) {
                return res.status(HttpStatus.CONFLICT).json({ error: error.message });
            }
            return res.status(HttpStatus.BAD_REQUEST).json({ error: error.message || 'Failed to create robot' });
        }
    }

    @Put(':vin')
    async update(@Param('vin') vin: string, @Body() body: any, @Res() res: Response) {
        try {
            const robot = await this.robotsService.update(vin, body);
            return res.status(HttpStatus.OK).json({ robot });
        } catch (error) {
            return res.status(HttpStatus.NOT_FOUND).json({ error: error.message });
        }
    }

    @Delete(':vin')
    async remove(@Param('vin') vin: string, @Res() res: Response) {
        try {
            const message = await this.robotsService.remove(vin);
            return res.status(HttpStatus.OK).json(message);
        } catch (error) {
            return res.status(HttpStatus.NOT_FOUND).json({ error: error.message });
        }
    }
}