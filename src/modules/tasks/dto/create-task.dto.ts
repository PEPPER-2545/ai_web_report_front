import { IsNotEmpty, IsString, IsEnum, IsOptional } from 'class-validator';

export class CreateTaskDto {
    @IsNotEmpty()
    @IsString()
    taskId: string;

    @IsNotEmpty()
    @IsString()
    taskName: string;

    @IsNotEmpty()
    @IsString()
    mapName: string;

    @IsNotEmpty()
    @IsString()
    mode: string;

    @IsNotEmpty()
    @IsString()
    purpose: string;

    @IsNotEmpty()
    @IsString()
    siteName: string;

    @IsNotEmpty()
    @IsEnum(['METTBOT', 'METTPOLE'])
    domain: string;
}
