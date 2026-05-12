import { Module } from '@nestjs/common';
import { IvCamerasController } from './controllers/iv-cameras.controller';
import { IvCamerasService } from './services/iv-cameras.service';

@Module({
    providers: [IvCamerasService],
    controllers: [IvCamerasController],
    exports: [IvCamerasService],
})
export class MroiModule {}