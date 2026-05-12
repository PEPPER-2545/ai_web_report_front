// back/src/modules/mroi/services/iv-cameras.service.ts
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { DataSource } from 'typeorm';
import * as ffmpeg from 'fluent-ffmpeg';
import { PassThrough } from 'stream';
import { NodeSSH } from 'node-ssh';
import * as mqtt from 'mqtt';
import { Response } from 'express';
import { InjectDataSource } from '@nestjs/typeorm';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

const execAsync = promisify(exec);

// ✅ FIX #5: FFmpeg path detection (from env or auto-detect from PATH)
function setupFFmpegPath(): void {
  const ffmpegPathEnv = process.env.FFMPEG_PATH;
  const ffprobePathEnv = process.env.FFPROBE_PATH;
  
  if (ffmpegPathEnv) {
    // Use explicitly configured path from .env
    if (!fs.existsSync(ffmpegPathEnv)) {
      console.warn(`⚠️ FFMPEG_PATH configured but not found: ${ffmpegPathEnv}`);
    } else {
      ffmpeg.setFfmpegPath(ffmpegPathEnv);
    }
  }
  
  if (ffprobePathEnv) {
    // Use explicitly configured path from .env
    if (!fs.existsSync(ffprobePathEnv)) {
      console.warn(`⚠️ FFPROBE_PATH configured but not found: ${ffprobePathEnv}`);
    } else {
      ffmpeg.setFfprobePath(ffprobePathEnv);
    }
  }
  
  // If not configured, fluent-ffmpeg will auto-detect from system PATH
  // This works on Linux, macOS, and Windows if ffmpeg/ffprobe are in PATH
}

setupFFmpegPath();

@Injectable()
export class IvCamerasService implements OnModuleInit {
  private readonly logger = new Logger(IvCamerasService.name);

  constructor(
    @InjectDataSource('mroi_db_conn') 
    private dataSource: DataSource // จะเชื่อมต่อกับ ivs_service อัตโนมัติ
  ) {
    // ✅ Constructor is now clean - no async operations
  }

  // ✅ Lifecycle hook for async initialization
  async onModuleInit() {
    await this.checkFFmpegInstallation();
  }

  // ตรวจสอบว่า FFmpeg ติดตั้งแล้วหรือไม่
  private async checkFFmpegInstallation() {
    try {
      await execAsync('ffmpeg -version');
      this.logger.log('✅ FFmpeg is installed');
    } catch (error) {
      this.logger.warn('⚠️ FFmpeg is NOT installed. Snapshot capture will fail.');
      this.logger.warn('Please install FFmpeg: apt-get install ffmpeg (Linux) or brew install ffmpeg (Mac)');
    }
  }

  // Endpoint สำหรับ Frontend เพื่อเช็ค status
  async getFFmpegStatus(): Promise<{ installed: boolean; version?: string; error?: string }> {
    try {
      const { stdout } = await execAsync('ffmpeg -version');
      const versionLine = stdout.split('\n')[0];
      return { 
        installed: true, 
        version: versionLine 
      };
    } catch (error: any) {
      return { 
        installed: false, 
        error: 'FFmpeg is not installed on this server'
      };
    }
  }

//   constructor(private dataSource: DataSource) {}

  // ================= REPOSITORY LOGIC =================

  async getSchemasName() {
    // คำสั่ง SQL จะรันบน DB 192.168.100.83 ทันที
    const results = await this.dataSource.query(
      `SELECT schemaname FROM pg_catalog.pg_tables WHERE schemaname NOT IN ('pg_catalog', 'information_schema') GROUP BY schemaname ORDER BY schemaname ASC`
    );
    return results.map((r) => r.schemaname);
  }

  async getAllCamerasFromAllSchemas() {
    try {
      const schemas = await this.getSchemasName();
      let allCameras = [];

      for (const schema of schemas) {
        try {
          const tableCheckQuery = `
            SELECT EXISTS (
              SELECT FROM information_schema.tables 
              WHERE table_schema = '${schema}' AND table_name = 'iv_cameras'
            );
          `;
          const [tableExistsResult] = await this.dataSource.query(tableCheckQuery);
          
          // TypeORM query returns array, check existence
          if (!tableExistsResult || !tableExistsResult.exists) {
            continue;
          }

          const camerasInSchema = await this.getCamerasData(schema);
          const camerasWithSchema = camerasInSchema.map((cam) => ({
            ...cam,
            workspace: schema,
          }));
          allCameras = allCameras.concat(camerasWithSchema);
        } catch (innerError) {
          this.logger.warn(`Could not fetch cameras from schema "${schema}": ${innerError.message}`);
        }
      }
      return allCameras;
    } catch (error) {
      this.logger.error('Error in getAllCamerasFromAllSchemas', error);
      throw error;
    }
  }

  async getRoiData(schema: string, key: string) {
    try {
      // Use fully qualified name to avoid SET search_path issues in connection pool
      const query = `
        SELECT "metthier_ai_config" 
        FROM "${schema}"."iv_cameras" 
        WHERE "iv_camera_uuid" = $1
      `;
      const [result] = await this.dataSource.query(query, [key]);
      return result ? result.metthier_ai_config : null;
    } catch (error) {
      this.logger.error('Error in getRoiData', error);
      throw error;
    }
  }

  async getCamerasData(schemaName: string) {
    const safeSchemaName = String(schemaName).replace(/[^a-zA-Z0-9_]/g, '');
    try {
      const query = `
        SELECT "iv_camera_uuid", "camera_name", "camera_name_display", "camera_site",
               "rtsp", "metthier_ai_config", "device_id", "camera_type"
        FROM "${safeSchemaName}"."iv_cameras"
        ORDER BY "camera_site" ASC
      `;
      const results = await this.dataSource.query(query);
      return results;
    } catch (error) {
      this.logger.error(`Error in getCamerasData for schema "${schemaName}"`, error);
      return [];
    }
  }

  async updateMetthierAiConfig(schemaName: string, cameraId: string, newConfig: any) {
    const safeSchemaName = String(schemaName).replace(/[^a-zA-Z0-9_]/g, '');
    
    // 1. Fetch existing config
    const findQuery = `SELECT "metthier_ai_config" FROM "${safeSchemaName}"."iv_cameras" WHERE "iv_camera_uuid" = $1`;
    const [camera] = await this.dataSource.query(findQuery, [cameraId]);

    if (!camera) return 0;

    const existingConfig = camera.metthier_ai_config || {};
    let finalConfig;

    // Logic: Merge or Overwrite
    if (
      existingConfig &&
      Array.isArray(existingConfig.rule) &&
      existingConfig.rule.length === 0 &&
      Object.keys(existingConfig).length === 1
    ) {
      finalConfig = newConfig;
    } else {
      finalConfig = { ...existingConfig, ...newConfig };
    }

    // 2. Update
    const updateQuery = `UPDATE "${safeSchemaName}"."iv_cameras" SET "metthier_ai_config" = $1 WHERE "iv_camera_uuid" = $2`;
    // TypeORM raw query doesn't return affected rows directly like Sequelize in standard format easily, 
    // but we can check the result. For postgres, query returns [[], number].
    const [, affectedRows] = await this.dataSource.query(updateQuery, [JSON.stringify(finalConfig), cameraId]);
    
    return affectedRows;
  }

  // ================= SSH & MQTT LOGIC =================

  async executeSshCommand(connectionDetails: any, command: string) {
    const ssh = new NodeSSH();
    const connectionConfig = {
      host: connectionDetails.host,
      port: connectionDetails.port,
      username: connectionDetails.username,
      password: connectionDetails.password,
      timeout: 10000,
    };

    try {
      await ssh.connect(connectionConfig);
      const result = await ssh.execCommand(command);
      this.logger.log('SSH STDOUT: ' + result.stdout);
      if (result.stderr && result.code !== 0) {
        throw new Error(result.stderr);
      }
      ssh.dispose();
      return { success: true, stdout: result.stdout };
    } catch (error) {
      this.logger.error('SSH Execution Error', error);
      if (ssh.isConnected()) ssh.dispose();
      throw error;
    }
  }

  async sendMqttRestart() {
    return new Promise((resolve, reject) => {
      const client = mqtt.connect('mqtt://mqtt-open.metthier.ai:61883');
      client.on('connect', () => {
        const topic = '/intrusion/motion_out';
        const message = JSON.stringify({ command: 'restart' });
        client.publish(topic, message, (err) => {
          client.end();
          if (err) reject(err);
          else resolve('MQTT sent successfully');
        });
      });
      client.on('error', (err) => {
        client.end();
        reject(err);
      });
    });
  }

  // ================= SNAPSHOT LOGIC =================

  captureSnapshot(rtsp: string, res: Response) {
    try {
      // ตรวจสอบ RTSP URL ว่าถูกต้องหรือไม่
      if (!rtsp || rtsp.trim() === '') {
        this.logger.error('Empty RTSP URL provided');
        if (!res.headersSent) {
          res.status(400).json({ error: 'Invalid RTSP URL' });
        }
        return;
      }

      this.logger.log(`Attempting to capture snapshot from: ${rtsp}`);

      // Generate temporary file path in Windows temp directory
      const tempDir = os.tmpdir();
      const tempFileName = `snapshot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.jpg`;
      const tempFilePath = path.join(tempDir, tempFileName);

      // Set response headers for image
      res.setHeader('Content-Type', 'image/jpeg');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

      // Default resolution 1080p
      const resolution = [1920, 1080];
      const filters = [
        'fps=1',
        'eq=contrast=1.2:brightness=0.05:saturation=1.3',
        `scale=${resolution[0]}:${resolution[1]}`,
      ];

      const ffmpegCommand = ffmpeg(rtsp)
        .inputOptions([
          '-rtsp_transport tcp',
          '-timeout 5000000',
          '-analyzeduration 10000000',
        ])
        .outputOptions([
          `-vf ${filters.join(',')}`,
          '-frames:v 1',
          '-ss 00:00:01',
          '-q:v 2',
          '-f image2',
        ])
        .output(tempFilePath);  // Output to temp file instead of pipe

      // Timeout handler
      let timeoutHandle: NodeJS.Timeout;
      ffmpegCommand.on('start', () => {
        timeoutHandle = setTimeout(() => {
          ffmpegCommand.kill('SIGTERM');
          this.logger.warn('FFmpeg snapshot timeout');
          
          // Cleanup temp file
          fs.unlink(tempFilePath, (err) => {
            if (err) this.logger.warn(`Failed to delete temp file: ${err.message}`);
          });
          
          if (!res.headersSent) {
            res.status(504).json({ error: 'Snapshot capture timeout' });
          }
        }, 180000); // 15 second timeout
      });

      // Error handler สำหรับ FFmpeg
      ffmpegCommand.on('error', (err) => {
        clearTimeout(timeoutHandle);
        this.logger.error(`FFmpeg error: ${err.message}`, err.stack);
        
        // Cleanup temp file on error
        fs.unlink(tempFilePath, (unlinkErr) => {
          if (unlinkErr && unlinkErr.code !== 'ENOENT') {
            this.logger.warn(`Failed to delete temp file on error: ${unlinkErr.message}`);
          }
        });
        
        if (!res.headersSent) {
          res.status(500).json({ 
            error: 'Failed to capture snapshot',
            details: err.message,
            suggestion: 'Ensure FFmpeg is installed and RTSP URL is valid'
          });
        } else {
          res.end();
        }
      });

      // Success handler - verify file then read and send
      ffmpegCommand.on('end', () => {
        clearTimeout(timeoutHandle);
        this.logger.log('Snapshot captured successfully');
        
        // ✅ Step 1: Verify temp file exists and has content (fix race condition)
        fs.stat(tempFilePath, (statErr, stats) => {
          if (statErr) {
            // File not found or stat failed
            fs.unlink(tempFilePath, (unlinkErr) => {
              if (unlinkErr && unlinkErr.code !== 'ENOENT') {
                this.logger.warn(`Failed to delete temp file on stat error: ${unlinkErr.message}`);
              }
            });
            
            this.logger.error(`Failed to stat temp file: ${statErr.message}`);
            if (!res.headersSent) {
              res.status(500).json({ error: 'Temp file not found' });
            }
            return;
          }

          // ✅ Step 2: Check if file is empty (race condition indicator)
          if (stats.size === 0) {
            fs.unlink(tempFilePath, (unlinkErr) => {
              if (unlinkErr && unlinkErr.code !== 'ENOENT') {
                this.logger.warn(`Failed to delete empty temp file: ${unlinkErr.message}`);
              }
            });
            
            this.logger.error('⚠️ Temp file is empty - FFmpeg did not capture image (race condition?)');
            if (!res.headersSent) {
              res.status(500).json({ error: 'Failed to capture snapshot - empty result' });
            }
            return;
          }

          this.logger.debug(`✅ Temp file verified: ${stats.size} bytes`);

          // ✅ Step 3: File is valid, now safe to read
          fs.readFile(tempFilePath, (err, data) => {
            // Cleanup temp file regardless of read success/failure
            fs.unlink(tempFilePath, (unlinkErr) => {
              if (unlinkErr && unlinkErr.code !== 'ENOENT') {
                this.logger.warn(`Failed to delete temp file: ${unlinkErr.message}`);
              }
            });

            if (err) {
              this.logger.error(`Failed to read temp snapshot file: ${err.message}`, err.stack);
              if (!res.headersSent) {
                res.status(500).json({ 
                  error: 'Failed to read snapshot file',
                  details: err.message
                });
              }
              return;
            }

            // ✅ Step 4: Verify data is not empty
            if (!data || data.length === 0) {
              this.logger.error('⚠️ Read data is empty - buffer allocation issue');
              if (!res.headersSent) {
                res.status(500).json({ error: 'Failed to read snapshot - empty data' });
              }
              return;
            }

            this.logger.log(`✅ Sending snapshot: ${data.length} bytes`);
            if (!res.headersSent) {
              res.send(data);
            }
          });
        });
      });

      // Start FFmpeg process
      ffmpegCommand.run();

    } catch (err) {
      this.logger.error('Snapshot unexpected error', err);
      if (!res.headersSent) {
        res.status(500).json({ 
          error: 'Internal error during snapshot capture',
          details: err instanceof Error ? err.message : String(err)
        });
      }
    }
  }
}