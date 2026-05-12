import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity({ schema: 'metthier', name: 'ml_robot_images' })
export class RobotImage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  site: string;

  @Column({ name: 'image_type' })
  imageType: string;

  // [เพิ่มส่วนนี้ครับ] ถ้าขาดส่วนนี้ TypeORM จะไม่รู้ว่าต้องบันทึกชื่อรูป
  @Column({ name: 'image_name', nullable: true }) 
  imageName: string;

  @Column({ name: 'image_path' })
  imageUrl: string;

  @CreateDateColumn({ name: 'upload_date' })
  createdAt: Date;
}