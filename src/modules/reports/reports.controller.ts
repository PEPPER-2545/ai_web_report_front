import { Controller, Get, Param, Query, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReportsController {
    constructor(private readonly reportsService: ReportsService) { }

    // =========================================================
    // 1. Specific Routes (วางไว้บนสุดเสมอ)
    // =========================================================

    // --- API สำหรับ Migration & Robot ---

    @Get('cam-owners')
    async getCamOwners() {
        return this.reportsService.getCamOwners();
    }

    @Get('robot-sites')
    async getRobotSites() {
        return this.reportsService.getRobotSites();
    }

    @Get('workforce/departments') // ย้ายมาไว้ตรงนี้ (ก่อน :id)
    async getDepartments(@Query('search') search: string, @Query('empCode') empCode: string) {
        const departments = await this.reportsService.getWorkforceDepartments(search, empCode);
        return { departments };
    }

    // --- Jasper Reports ---

    @Get('jasper/robot-cleaning') // ย้ายมาไว้ตรงนี้
    async getRobotCleaningReport(
        @Query('site') site: string,
        @Query('month') month: string,
        @Query('year') year: string,
        @Query('format') format: string,
        @Res() res: Response
    ) {
        const { stream, filename, mimeType } = await this.reportsService.fetchRobotCleaningReport(site, month, year, format);

        res.set({
            'Content-Type': mimeType,
            'Content-Disposition': `attachment; filename="${filename}"`,
        });
        stream.pipe(res);
    }

    @Get('jasper/gbbut')
    async getGbbUtReport(@Query('site') site: string, @Query('month') month: string, @Query('year') year: string, @Res() res: Response) {
        const stream = await this.reportsService.fetchJasperReport('mioc_external_report_gbb_ut', { cameraOwner: site, startMonth: month, startYear: year });
        this.streamPdf(res, `report_gbb-ut_${site}_${month}_${year}.pdf`, stream);
    }

    @Get('jasper/general')
    async getGeneralReport(@Query('site') site: string, @Query('month') month: string, @Query('year') year: string, @Res() res: Response) {
        const stream = await this.reportsService.fetchJasperReport('mioc_external_report', { cameraOwner: site, startMonth: month, startYear: year });
        this.streamPdf(res, `report_${site}_${month}_${year}.pdf`, stream);
    }

    @Get('jasper/face-rec')
    async getFaceRecReport(@Query('site') site: string, @Query('month') month: string, @Query('year') year: string, @Res() res: Response) {
        const stream = await this.reportsService.fetchJasperReport('face_rec_nobl', { cameraOwner: site, startMonth: month, startYear: year });
        this.streamPdf(res, `report_face_rec_${site}_${month}_${year}.pdf`, stream);
    }

    // =========================================================
    // 2. Generic / Parameterized Routes (วางไว้ล่างสุด)
    // =========================================================

    @Get()
    async findAll(@Query('domain') domain: string) {
        return this.reportsService.findAll(domain);
    }

    @Get(':id') // ตัวนี้จะรับค่าทุกอย่างที่ไม่ตรงกับด้านบนว่าเป็น ID
    async findOne(@Param('id') id: string) {
        return this.reportsService.findOne(id);
    }


    @Get(':id/download')
    async download(@Param('id') id: string, @Res() res: Response) {
        const file = await this.reportsService.downloadFile(id);
        const report = await this.reportsService.findOne(id);

        res.set({
            'Content-Type': 'application/octet-stream',
            'Content-Disposition': `attachment; filename="${report.name}"`,
        });

        res.send(file);
    }

    // Helper function
    private streamPdf(res: Response, filename: string, stream: any) {
        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="${filename}"`,
        });
        stream.pipe(res);
    }
}