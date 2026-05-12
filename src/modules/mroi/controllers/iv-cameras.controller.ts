// back/src/modules/mroi/controllers/iv-cameras.controller.ts
import { Controller, Get, Post, Query, Body, Res, Param, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { IvCamerasService } from '../services/iv-cameras.service';

// ถ้าต้องการ Authentication ให้ uncomment @UseGuards
// import { UseGuards } from '@nestjs/common';
// import { AuthGuard } from '@nestjs/passport';

@Controller('mroi/iv-cameras')
// @UseGuards(AuthGuard('jwt')) // เปิดใช้ถ้าระบบเดิมต้องการ Login
export class IvCamerasController {
  constructor(private readonly ivCamerasService: IvCamerasService) {}

  @Get('schemas')
  async getSchemas() {
    return await this.ivCamerasService.getSchemasName();
  }

  @Get('cameras/all')
  async getAllCameras() {
    return await this.ivCamerasService.getAllCamerasFromAllSchemas();
  }

  @Get('fetch/roi/data')
  async getRoiData(@Query('schema') schema: string, @Query('key') key: string) {
    const roiConfig = await this.ivCamerasService.getRoiData(schema, key);
    // Note: Logic for 'line_users_sensetimes' updated_at is omitted as it was missing in provided repo files.
    // Returning structure similar to old backend
    if (roiConfig && typeof roiConfig === 'object') {
      return { ...roiConfig, updated_at: null };
    }
    return { rule: [], updated_at: null };
  }

  @Get('schemas/:SchemaSite')
  async getCamerasBySchema(@Param('SchemaSite') schemaSite: string) {
    return await this.ivCamerasService.getCamerasData(schemaSite);
  }

  @Get('snapshot')
  snapshot(@Query('rtsp') rtsp: string, @Res() res: Response) {
    if (!rtsp) return res.status(HttpStatus.BAD_REQUEST).send("RTSP URL is required");
    return this.ivCamerasService.captureSnapshot(rtsp, res);
  }

  @Get('health')
  async getHealth() {
    return await this.ivCamerasService.getFFmpegStatus();
  }

  @Post('save-region-config')
  async saveRegionConfig(
    @Query('customer') customer: string,
    @Query('cameraId') cameraId: string,
    @Body() body: { rule: any }
  ) {
    const { rule } = body;
    if (!customer || !cameraId || !rule) {
      return { message: 'Missing required fields.' };
    }

    const configToSave = { rule };

    try {
      const affectedRows = await this.ivCamerasService.updateMetthierAiConfig(customer, cameraId, configToSave);

      if (affectedRows > 0) {
        // Fetch updated config to check docker_info
        const fullConfig: any = await this.ivCamerasService.getRoiData(customer, cameraId);

        if (fullConfig && fullConfig.docker_info && typeof fullConfig.docker_info === 'object') {
            // SSH Logic
            const connectionDetails = {
                host: fullConfig.docker_info.ip,
                port: fullConfig.docker_info.port,
                username: fullConfig.docker_info.user,
                password: fullConfig.docker_info.pass
            };
            const command = `docker restart ${fullConfig.docker_info['docker_name']}`;
            
            try {
                await this.ivCamerasService.executeSshCommand(connectionDetails, command);
                return { message: 'Config saved and restart command sent via SSH.' };
            } catch (e) {
                return { message: 'Config saved but SSH failed', error: e.message };
            }
        } else {
            // MQTT Logic
            try {
                await this.ivCamerasService.sendMqttRestart();
                return { message: 'Config saved and restart command sent via MQTT.' };
            } catch (e) {
                return { message: 'Config saved but MQTT failed', error: e.message };
            }
        }
      } else {
        return { message: 'Save failed: No matching camera found.' };
      }
    } catch (err) {
      return { message: 'Failed to save configuration', error: err.message };
    }
  }
}