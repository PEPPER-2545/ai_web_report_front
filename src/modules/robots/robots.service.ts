import { Injectable, ConflictException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm'; // <--- 1. เพิ่ม Import นี้
import { DataSource } from 'typeorm';

@Injectable()
export class RobotsService {
    constructor(
        @InjectDataSource('robot_conn') private dataSource: DataSource // <--- 2. ใส่ Decorator ระบุชื่อ Connection
    ) { }

    async findAll() {
        const result = await this.dataSource.query(
            'SELECT * FROM metthier.ml_robots WHERE deleted_at IS NULL ORDER BY vin'
        );
        return result;
    }

    async create(data: any) {
        const { vin, name, display_name, workspace_id, site, active, api_driver } = data; // <--- เพิ่ม api_driver

        // Validation แบบง่าย
        if (!vin || !name) {
            throw new Error('VIN and Name are required');
        }

        try {
            const result = await this.dataSource.query(
                `INSERT INTO metthier.ml_robots (vin, name, display_name, workspace_id, site, active, api_driver, created_at, updated_at)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
                 RETURNING *`,
                [vin, name, display_name, workspace_id, site, active, api_driver] // <--- เพิ่ม api_driver
            );
            return result[0];
        } catch (error) {
            if (error.code === '23505') { // Unique violation code ของ Postgres
                throw new ConflictException('Robot with this VIN already exists');
            }
            throw error;
        }
    }

    async update(vin: string, data: any) {
        // 1. กรองเฉพาะฟิลด์ที่อนุญาตให้แก้ไข และมีค่าส่งมาจริงๆ
        const allowedFields = ['name', 'display_name', 'site', 'active', 'api_driver']; // <--- เพิ่ม api_driver
        const fieldsToUpdate = [];
        const values = [];
        let argIndex = 1;

        for (const field of allowedFields) {
            if (data[field] !== undefined) { // ตรวจสอบว่ามีการส่งฟิลด์นี้มาไหม
                fieldsToUpdate.push(`${field} = $${argIndex}`);
                values.push(data[field]);
                argIndex++;
            }
        }

        // ถ้าไม่มีข้อมูลส่งมาให้แก้ไขเลย ให้ return ออกไปก่อน
        if (fieldsToUpdate.length === 0) {
            throw new Error('No data provided for update');
        }

        // 2. เพิ่ม vin เป็น Parameter ตัวสุดท้ายสำหรับ WHERE clause
        values.push(vin);
        const vinIndex = argIndex;

        // 3. สร้าง SQL String
        const sql = `
            UPDATE metthier.ml_robots
            SET ${fieldsToUpdate.join(', ')}, updated_at = NOW()
            WHERE vin = $${vinIndex}
            RETURNING *
        `;

        try {
            const result = await this.dataSource.query(sql, values);

            if (result.length === 0) {
                throw new Error('Robot not found');
            }

            return result[0];
        } catch (error) {
            console.error("Update Error:", error);
            throw error;
        }
    }

    async remove(vin: string) {
        const result = await this.dataSource.query(
            `UPDATE metthier.ml_robots
             SET deleted_at = NOW()
             WHERE vin = $1
             RETURNING *`,
            [vin]
        );

        if (result.length === 0) {
            throw new Error('Robot not found');
        }
        return { message: 'Robot deleted successfully' };
    }
}