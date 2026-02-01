import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

/**
 * order list: ใช้เก็บข้อมูล order usage
 */
@Entity({ name: 'orders_usage' })
export class OrdersUsage {
    /** รหัสงาน (PK) */
    @PrimaryGeneratedColumn({ type: 'int', unsigned: true, comment: 'Primary key of order usage' })
    usage_id!: number;

    /** FK เชื่อมกับ Orders */
    @Column({ type: 'int', unsigned: true })
    order_id!: number;

    /** หมายเลขออเดอร์/ใบคำขอ */
    @Column({ type: 'varchar', length: 50, nullable: true, default: null, comment: 'Order ID to group multiple SKU tasks'})
    work_order?: string;
    
    /** เก็บ SPR NO */
    @Column({ type: 'varchar', length: 50, nullable: true, comment: 'SPR NO' })
    spr_no?: string;

    /** usage_num */
    @Column({ type: 'varchar', length: 50, nullable: true, comment: 'Usage number' })
    usage_num?: string;

    /** line */
    @Column({ type: 'varchar', length: 30, nullable: true, comment: 'Line' })
    usage_line?: string;

    /** ประเภทการใช้งาน เช่น ISSUE (Usage) */
    @Column({ type: 'varchar', length: 50, nullable: true, comment: 'Usage type (e.g. ISSUE)' })
    usage_type?: string;

    /** split flag (0 = no split) */
    @Column({ type: 'tinyint', default: 0, nullable: true, comment: 'Split flag (0 = no split, 1 = split)' })
    split?: number;

    /** Inventory Use Status เช่น STAGED / ENTERED */
    @Column({ type: 'varchar', length: 50, nullable: true, comment: 'Inventory Use Status' })
    invuse_status?: string;

    /** FK เชื่อมกับ inventory summary */
    @Column({ type: 'int', nullable: true })
    sum_inv_id?: number;
}