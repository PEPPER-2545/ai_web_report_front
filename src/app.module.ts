import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config'; // เพิ่ม ConfigService
import { TypeOrmModule } from '@nestjs/typeorm';
import { DatabaseModule } from './database/database.module';
import { StorageModule } from './storage/storage.module';
import { AuthModule } from './modules/auth/auth.module';
import { ReportsModule } from './modules/reports/reports.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { ImagesModule } from './modules/images/images.module';
import { UsersModule } from './modules/users/users.module';
import { RobotsModule } from './modules/robots/robots.module';
import { MroiModule } from './modules/mroi/mroi.module';
import { IncidentsModule } from './modules/incidents/incidents.module';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
        }),
        
        // 1. Connection หลัก (Know DB) - ใช้ DatabaseModule จัดการ (ไม่ต้องแก้)
        DatabaseModule,

        // 2. Connection รอง (MIOC DB) - แก้ไขส่วนนี้
        TypeOrmModule.forRootAsync({
            name: 'mioc_conn', // ชื่อ Connection
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (configService: ConfigService) => ({
                type: 'postgres',
                host: configService.get<string>('MIOC_DB_HOST'),
                port: configService.get<number>('MIOC_DB_PORT'),
                username: configService.get<string>('MIOC_DB_USERNAME'),
                password: configService.get<string>('MIOC_DB_PASSWORD'),
                database: configService.get<string>('MIOC_DB_NAME'),
                synchronize: false,
                autoLoadEntities: false, // เราใช้ Raw Query ไม่ต้องโหลด Entity
            }),
        }),
        TypeOrmModule.forRootAsync({
            name: 'robot_conn',
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (configService: ConfigService) => ({
                type: 'postgres',
                host: configService.get('ROBOT_DB_HOST'),
                port: configService.get('ROBOT_DB_PORT'),
                username: configService.get('ROBOT_DB_USER'),
                password: configService.get('ROBOT_DB_PASSWORD'),
                database: configService.get('ROBOT_DB_NAME'),
                synchronize: false,
                autoLoadEntities: false,
                ssl: { rejectUnauthorized: false } // สำคัญ! ต้องใส่เพราะ DB เก่าใช้ SSL
            }),
        }),

        // 3. [เพิ่มใหม่] Workforce Connection
        TypeOrmModule.forRootAsync({
            name: 'wf_conn',
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (configService: ConfigService) => ({
                type: 'postgres',
                host: configService.get('WF_DB_HOST'),
                port: configService.get('WF_DB_PORT'),
                username: configService.get('WF_DB_USER'),
                password: configService.get('WF_DB_PASSWORD'),
                database: configService.get('WF_DB_NAME'),
                synchronize: false,
                autoLoadEntities: false,
                ssl: { rejectUnauthorized: false }
            }),
        }),

        StorageModule,
        AuthModule,
        ReportsModule,
        TasksModule,
        ImagesModule,
        UsersModule,
        RobotsModule,
        MroiModule,
        IncidentsModule,
    ],
})
export class AppModule { }