import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Task } from '@/modules/tasks/entities/task.entity';
import { RobotImage } from '@/modules/images/entities/robot-image.entity';

@Module({
    imports: [
        // การเชื่อมต่อฐานข้อมูลหลักของระบบ (Default)
        TypeOrmModule.forRootAsync({
            imports: [ConfigModule],
            useFactory: (configService: ConfigService) => ({
                type: 'postgres',
                host: configService.get('DATABASE_HOST'),
                port: configService.get('DATABASE_PORT'),
                username: configService.get('DATABASE_USERNAME'),
                password: configService.get('DATABASE_PASSWORD'),
                database: configService.get('DATABASE_NAME'),
                entities: [__dirname + '/../**/*.entity{.ts,.js}'],
                synchronize: false,
                logging: true,
                // ✅ Connection Pool Settings (via pg driver)
                extra: {
                    max: 5,                         // Max concurrent connections
                    min: 1,                         // Min connections to maintain
                    idleTimeoutMillis: 30000,       // Close idle connections after 30s
                    connectionTimeoutMillis: 5000,  // Timeout for new connections
                    statement_timeout: 30000,       // Statement timeout 30s
                },
            }),
            inject: [ConfigService],
        }),

        // การเชื่อมต่อฐานข้อมูล MROI (เชื่อมต่อไปยัง 192.168.100.83)
        TypeOrmModule.forRootAsync({
            name: 'mroi_db_conn', // ชื่อการเชื่อมต่อสำหรับเรียกใช้ใน Service
            imports: [ConfigModule],
            useFactory: (configService: ConfigService) => ({
                type: 'postgres',
                host: configService.get('MROI_DB_HOST'),
                port: configService.get('MROI_DB_PORT'),
                username: configService.get('MROI_DB_USERNAME'),
                password: configService.get('MROI_DB_PASSWORD'),
                database: configService.get('MROI_DB_NAME'), // ค่าคือ ivs_service
                entities: [],
                synchronize: false,
                logging: true,
                // ✅ Connection Pool Settings (via pg driver)
                extra: {
                    max: 5,                         // Max concurrent connections
                    min: 1,                         // Min connections to maintain
                    idleTimeoutMillis: 30000,       // Close idle connections after 30s
                    connectionTimeoutMillis: 5000,  // Timeout for new connections
                    statement_timeout: 30000,       // Statement timeout 30s
                },
            }),
            inject: [ConfigService],
        }),
        TypeOrmModule.forRootAsync({
            name: 'ROBOT_CONNECTION', 
            imports: [ConfigModule],
            useFactory: (configService: ConfigService) => ({
                type: 'postgres',
                host: configService.get('ROBOT_DB_HOST'),
                port: configService.get('ROBOT_DB_PORT'),
                username: configService.get('ROBOT_DB_USER'),
                password: configService.get('ROBOT_DB_PASSWORD'),
                database: configService.get('ROBOT_DB_NAME'), // ค่าคือ data_robot
                entities: [__dirname + '/../**/*.entity{.ts,.js}'],
                synchronize: false,
                logging: true,
                extra: {
                    max: 5,
                    idleTimeoutMillis: 30000,
                },
            }),
            inject: [ConfigService],
        }),
    ],
    
})
export class DatabaseModule { }