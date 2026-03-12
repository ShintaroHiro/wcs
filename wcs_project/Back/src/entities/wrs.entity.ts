import { Entity, PrimaryGeneratedColumn, Column, Index } from 'typeorm';

/**
 * WRS/AMR: ใช้เก็บรายละเอียดหุ่นยนต์และorder ที่ต้องทำงาน
 */
@Entity({ name: 'wrs' })
export class WRS {

    @PrimaryGeneratedColumn({ type: 'int', unsigned: true })
    wrs_id!: number;

    //รหัส parent amr
    @Column({ type: 'varchar', length: 50, nullable: true })
    wrs_code: string;

    /** Idle / Delivering / Returning / Error */
    @Column({ type: 'varchar', length: 30 })
    wrs_status!: string;

    /** ตำแหน่งปัจจุบันของหุ่นยนต์ */
    @Column({ type: 'int', unsigned: true, nullable: true })
    current_loc_id: number | null;

    /** order ที่กำลังทำอยู่ */
    @Column({ type: 'int', unsigned: true, nullable: true })
    current_order_id: number | null;

    /** counter เป้าหมาย */
    @Column({ type: 'int', unsigned: true, nullable: true })
    target_counter_id: number | null;

    /** พร้อมรับงานใหม่หรือไม่ */
    @Column({ type: 'boolean', default: true })
    is_available!: boolean;

    /** heartbeat จาก RCS */
    @Column({ type: 'timestamp', nullable: true })
    last_heartbeat?: Date;

    @Column({ type: 'tinyint', width: 1, default: 0, comment: 'Emergency stop active (0/1)' })
    e_stop!: boolean;

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    created_at!: Date;
}
