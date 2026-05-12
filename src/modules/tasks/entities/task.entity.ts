import { Entity, Column, PrimaryColumn } from 'typeorm';

@Entity({ schema: 'metthier', name: 'ml_robot_tasks' }) // เชื่อมตารางเดียวกับ robot_web
export class Task {
  @PrimaryColumn()
  task_id: string;

  @Column()
  task_name: string;

  @Column()
  map_name: string;

  @Column()
  mode: string;

  @Column()
  purpose: string;

 @Column({ name: 'task_img' })
imageUrl: string;// เปลี่ยนจาก string เป็น Buffer ถ้าเก็บภาพเป็น Binary ใน DB

  

  @Column({ name: 'site_name' })
  siteName: string;
}