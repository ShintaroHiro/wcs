import { Entity, PrimaryGeneratedColumn, Column, Index } from 'typeorm';
import { AisleStatus } from '../common/global.enum';

/**
 * aisle: ช่องทางเดินระหว่างชั้น (เปิดเพื่อให้คนเข้าไปหยิบ)
 * - ใช้กำหนด/ตรวจสถานะ OPEN/CLOSED/BLOCKED
 */
@Entity({ name: 'aisle' })
export class Aisle {
    /** รหัสช่องทางเดิน (PK) */
    @PrimaryGeneratedColumn({ type: 'int', unsigned: true, comment: 'Primary key of aisle' })
    aisle_id!: number;

    /** รหัสช่อง (A, B, C, …) */
    @Column({ type: 'varchar', length: 50, nullable: true, comment: 'Aisle code' })
    aisle_code!: string;

    /** กลุ่มชั้นวางเคลื่อนที่ที่ “แชร์ราง/คอนโทรลชุดเดียวกัน” เปิดได้ทีละช่องในกลุ่มนั้นเท่านั้น */
    @Column({ type: 'varchar', length: 50, nullable: true, comment: 'Bank code (group of MRS)' })
    bank_code!: string;

    /** สถานะของช่อง */
    @Column({ type: 'enum',enum:AisleStatus, default: AisleStatus.CLOSED, comment: 'Aisle status' })
    status!: AisleStatus;

    /** เวลาเปิด/ปิดล่าสุด */
    @Column({ type: 'timestamp',  nullable: true, comment: 'Last opened time (optional)' })
    last_opened_at?: Date;

    @Column({ type: 'timestamp',  nullable: true, comment: 'Last closed time (optional)' })
    last_closed_at?: Date;

    /** เวลาเกิดเหตุการณ์ล่าสุด (สำหรับ dashboard refresh) */
    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP'})
    last_event_at!: Date;

     /** order ที่กำลังทำอยู่ */
    @Column({ type: 'int', unsigned: true, nullable: true })
    current_order_id: number | null;

    /** ความกว้างปลอดภัยของช่อง (มม.) ถ้าใช้ตรวจสอบ */
    @Column({ type: 'int', nullable: true, comment: 'Safe aisle width (mm), optional' })
    safe_width_mm?: number;

    /** สถานะเซนเซอร์รายช่อง (beam/area scan) */
    @Column({ type: 'json', nullable: true, comment: 'Per-aisle sensor state, optional (JSON)' })
    sensor_state_json?: object;
    
    @Column({ length: 30, nullable: true })
    update_by: string;              // ผู้แก้ไขข้อมูล
}
