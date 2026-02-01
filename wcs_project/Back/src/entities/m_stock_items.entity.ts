import { Entity, PrimaryGeneratedColumn, Column, Index } from 'typeorm';

/**
 * master table เก็บข้อมูล items ทุกตัว
 */
@Entity({ name: 'm_stock_items' })
export class StockItems {
    /** รหัสงาน (PK) */
    @PrimaryGeneratedColumn({ type: 'int', unsigned: true, comment: 'Stock items' })
    item_id!: number;

    /** รหัส material */
    @Column({ type: 'varchar', length: 100, comment: 'Requested material(SKU)' })
    stock_item!: string;

    /** คำอธิบายสินค้า */
    @Column({ type: 'varchar', length: 255, nullable: true, comment: 'Item description' })
    item_desc?: string; 
    
    @Column({ length: 255, nullable: true })
    item_img: string;                   // รูปเครื่องมือ

    @Column({ length: 500, nullable: true })
    item_img_url: string;               // url เครื่องมือ

    /** เก็บ group code */
    @Column({ type: 'varchar', length: 50, nullable: true, comment: 'Maintenance contract' })
    mc_code: string | null;

    @Column({ type: 'varchar', length: 50, nullable: true, comment: 'Order Unit' })
    order_unit: string | null; 

    @Column({ type: 'varchar', length: 50, nullable: true, comment: 'Commodity Group' })
    com_group: string | null; 

    @Column({ type: 'varchar', length: 50, nullable: true, comment: 'Condition Enabled' })
    cond_en: string | null; 

    @Column({ type: 'varchar', length: 50, nullable: true, comment: 'Status' })
    item_status: string | null; 

    @Column({ type: 'varchar', length: 50, nullable: true, comment: 'Category Code' })
    catg_code: string | null; 

    @Column({ type: 'varchar', length: 50, nullable: true, comment: 'System' })
    system: string | null; 

    @Column({ nullable: false, default: true })
    is_active: boolean;

    /** ผู้ร้องขอ */
    @Column({ type: 'varchar', length: 50, nullable: true, comment: 'Requester user id/name' })
    requested_by?: string;

    /** เวลารับคำขอ */
    @Column({ type: 'timestamp',  default: () => 'CURRENT_TIMESTAMP', comment: 'Requested at' })
    requested_at!: Date;

    @Column({ length: 30, nullable: true })
    update_by?: string;

    /** เวลาอัปเดตล่าสุด*/
    @Column({  type: 'timestamp',  nullable: true, default: () => null })
    updated_at?: Date;

}