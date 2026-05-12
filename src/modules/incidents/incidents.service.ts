import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Injectable()
export class IncidentsService {
    constructor(
        @InjectDataSource('mioc_conn') private miocDataSource: DataSource
    ) {}

    // ... (ฟังก์ชัน getComplete, getIncomplete, getById, getIncidentReport เก็บไว้เหมือนเดิม) ...

    async getComplete() {
        const sql = `
            SELECT * 
            FROM intrusion_truealarms 
            WHERE deleted_at IS NULL 
            AND updated_at IS NOT NULL 
            AND (conclusion IS NOT NULL OR conclusion<>'')
            ORDER BY created_at DESC, event_time DESC
        `;
        return this.miocDataSource.query(sql);
    }

    async getIncomplete() {
        const sql = `
            SELECT * 
            FROM intrusion_truealarms 
            WHERE deleted_at IS NULL 
            AND (conclusion IS NULL OR conclusion ='')
        `;
        return this.miocDataSource.query(sql);
    }

    async getById(id: string) {
        const sql = `SELECT * FROM intrusion_truealarms WHERE id = $1`;
        const result = await this.miocDataSource.query(sql, [id]);
        return result[0];
    }

    async getIncidentReport(id: string): Promise<Buffer> {
        // ... Code เดิม ...
        const incident = await this.getById(id);
        if (!incident) throw new Error('Incident not found');
        
        const reportUnit = '12_trueAlarm.jrxml'; 
        const jasperBaseUrl = 'http://192.168.100.135:8080/jasperserver/rest_v2/reports/mioc_report_qa';
        const username = process.env.JASPER_USERNAME || 'miocadmin';
        const password = process.env.JASPER_PASSWORD || 'miocadmin';
        
        const params = {
            id: id,
            incident_id: id,
            p_id: id,
            incident_no: incident.incident_no 
        };

        const queryString = new URLSearchParams(params as any).toString();
        const url = `${jasperBaseUrl}/${reportUnit}.pdf?${queryString}`;
        const auth = Buffer.from(`${username}:${password}`).toString('base64');
        const response = await fetch(url, {
            method: 'GET',
            headers: { Authorization: `Basic ${auth}` }
        });
        if (!response.ok) throw new Error(`Jasper Failed: ${response.statusText}`);
        return Buffer.from(await response.arrayBuffer());
    }

   async update(id: string, updateData: any) {
    // ลบ ID ออกเพื่อความปลอดภัย
    delete updateData.id;

    const timeColumns = [
        'event_time', 
        'mioc_contract_time', 
        'officer_check_time', 
        'arrest_time', 
        'last_seen_time'
    ];

    Object.keys(updateData).forEach(key => {
    let value = updateData[key];

    if (value === '') {
        updateData[key] = null;
    } 
    // ถ้าเป็นคอลัมน์เวลาและมีเครื่องหมาย + (บอก Timezone)
    else if (timeColumns.includes(key) && typeof value === 'string' && value.includes('+')) {
        // ไม่ต้องทำอะไรครับ ปล่อยให้ Postgres จัดการเองได้เลย 
        // เพราะเราส่ง "16:16:00+07:00" ไป ซึ่งเป็น Format ที่ถูกต้องของ TIMETZ
        updateData[key] = value;
    }
});
    const fields = Object.keys(updateData);
    if (fields.length === 0) return false;

    // สร้าง SQL Clause
    const setClause = fields.map((field, index) => `"${field}" = $${index + 2}`).join(', ');
    const values = Object.values(updateData);

    const sql = `UPDATE intrusion_truealarms SET ${setClause}, updated_at = NOW() WHERE id = $1`;
    
    try {
        await this.miocDataSource.query(sql, [id, ...values]);
        return true;
    } catch (error) {
        console.error("Update Error:", error);
        throw error;
    }
}

    async delete(id: string) {
        const sql = `UPDATE intrusion_truealarms SET deleted_at = NOW() WHERE id = $1`;
        await this.miocDataSource.query(sql, [id]);
        return true;
    }

    
}