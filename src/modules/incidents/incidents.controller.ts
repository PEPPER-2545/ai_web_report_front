import { Controller, Get, Post, Delete, Param, Body, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express'; // สำคัญ: ต้อง import จาก express
import { IncidentsService } from './incidents.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

@Controller('incidents')
export class IncidentsController {
    constructor(private readonly incidentsService: IncidentsService) {}

    @Get('complete')
    async getComplete() {
        return this.incidentsService.getComplete();
    }

    @Get('incomplete')
    async getIncomplete() {
        return this.incidentsService.getIncomplete();
    }

    @Get(':id')
    async getById(@Param('id') id: string) {
        return this.incidentsService.getById(id);
    }

    @Get(':id/report')
    async getReport(@Param('id') id: string, @Res() res: Response) {
        try {
            const buffer = await this.incidentsService.getIncidentReport(id);
            
            // ตั้งค่า Header ให้ Browser รู้ว่าเป็นไฟล์ PDF
            res.set({
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="incident_${id}.pdf"`,
                'Content-Length': buffer.length,
            });
            
            res.send(buffer);
        } catch (error) {
            console.error('Download Error:', error);
            res.status(500).json({ error: 'Failed to generate report', details: error.message });
        }
    }

    @Post(':id/update')
    async update(@Param('id') id: string, @Body() updateData: any) {
        const success = await this.incidentsService.update(id, updateData);
        return { success, message: success ? 'Updated successfully' : 'Failed to update' };
    }

    @Delete(':id')
    async delete(@Param('id') id: string) {
        const success = await this.incidentsService.delete(id);
        return { success, message: success ? 'Deleted successfully' : 'Failed to delete' };
    }
}