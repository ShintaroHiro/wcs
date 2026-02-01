import { Entity, PrimaryGeneratedColumn, Column, Index } from 'typeorm';

/**
 * inventory summary table เก็บค่าเฉลี่ยของ cost ของรายการ inventory เดียวกัน
 */
@Entity({ name: 'inventory_sum' })
export class InventorySum {
    /** ไอดี summary inventory (PK) */
    @PrimaryGeneratedColumn({ type: 'int', unsigned: true, comment: 'Inventory ID' })
    sum_inv_id!: number;

    /** ไอดี stock item (Fk) */
    @Column({ type: 'int', unsigned: true })
    item_id!: number;

    /** ไอดี location และ box (FK) */
    @Column({ type: 'int', unsigned: true })
    loc_id!: number;

    /** เก็บ group code เอาไว้ filter ว่า ใครเห็น order ไหน*/
    @Column({ type: 'varchar', length: 50, nullable: true, comment: 'Maintenance contract' })
    mc_code: string | null;

    /** สภาพสินค้า เช่น NEW หรือ CAPITAL */
    @Column({ type: 'varchar', length: 50, nullable: true, comment: 'Item condition (NEW / CAPITAL)' })
    cond: string | null;

    /** ราคาต่อหน่วยแบบเฉลี่ย */
    @Column({
        type: 'decimal',
        precision: 15, // รวมจำนวนหลักทั้งหมด เช่น 999,999,999,999.99
        scale: 2,      // จำนวนหลักทศนิยม (2 = เก็บทศนิยม 2 ตำแหน่ง)
        default: 0,
        comment: 'Unit Cost',
        transformer: {
            // optional — เพื่อให้เวลาดึงจาก DB กลับมาเป็น number (ไม่ใช่ string)
            to: (value: number) => value,
            from: (value: string | null) => (value ? parseFloat(value) : 0),
        },
    })
    unit_cost_sum_inv: number;

    /** ราคารวม */
    @Column({
        type: 'decimal',
        precision: 15, // รวมจำนวนหลักทั้งหมด เช่น 999,999,999,999.99
        scale: 2,      // จำนวนหลักทศนิยม (2 = เก็บทศนิยม 2 ตำแหน่ง)
        default: 0,
        comment: 'Total Cost',
        transformer: {
            // optional — เพื่อให้เวลาดึงจาก DB กลับมาเป็น number (ไม่ใช่ string)
            to: (value: number) => value,
            from: (value: string | null) => (value ? parseFloat(value) : 0),
        },
    })
    total_cost_sum_inv: number;

    /** ORG ID */
    @Column({ type: 'varchar', length: 20, nullable: true, default: null, comment: 'ORG ID'})
    org_id?: string;
    
     /** Department */
    @Column({ type: 'varchar', length: 255, nullable: true, default: null, comment: 'Department'})
    dept?: string;

    /** จำนวนใน summary inventory */
    @Column({ type: 'int', nullable: true, default: 0, comment: 'Inventory Quantity' })
    sum_inv_qty!: number;

    /** stock_status */
    @Column({ nullable: false, default: true })
    is_active: boolean;

    /** updated_at */
    @Column({ type: 'timestamp',  default: () => 'CURRENT_TIMESTAMP', comment: 'Requested at' })
    updated_at!: Date;

}