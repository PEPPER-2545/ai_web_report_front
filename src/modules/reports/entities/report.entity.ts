import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity('reports')
export class Report {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    name: string;

    @Column({ type: 'enum', enum: ['pdf', 'jpg', 'png'] })
    fileType: string;

    @Column()
    fileUrl: string;

    @Column({ type: 'enum', enum: ['METTBOT', 'METTPOLE'] })
    domain: string;

    @CreateDateColumn()
    createdAt: Date;
}
