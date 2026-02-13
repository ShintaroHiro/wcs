import { Entity, PrimaryGeneratedColumn, Column, Index } from 'typeorm';

/**
 * inventory table เก็บรายการและจำนวนสินค้าที่มีอยู่ โดยแต่ละ stock item สามารถมีหลาย location ได้
 */
@Entity({ name: 'inventory' })
export class Inventory {
    /** ไอดี inventory (PK) */
    @PrimaryGeneratedColumn({ type: 'int', unsigned: true, comment: 'Inventory ID' })
    inv_id!: number;

    /** ไอดี stock item (Fk) */
    @Column({ type: 'int', unsigned: true })
    item_id!: number;

    /** ไอดี location และ box (FK) */
    @Column({ type: 'int', unsigned: true })
    loc_id!: number;

    /** ไอดี order_receipt id (FK) เพื่อ join เอา mc_code/ condition แล้วไป sum หน้า inventory*/
    @Column({ type: 'int', unsigned: true, nullable: true })
    receipt_id?: number;

        /** ราคาต่อหน่วย (Unit Cost) */
    @Column({
        type: 'decimal',
        precision: 15, // รวมจำนวนหลักทั้งหมด เช่น 999,999,999,999.99
        scale: 2,      // จำนวนหลักทศนิยม (2 = เก็บทศนิยม 2 ตำแหน่ง)
        default: 0,
        comment: 'Unit Cost (Materials in Inventory)',
        transformer: {
            // optional — เพื่อให้เวลาดึงจาก DB กลับมาเป็น number (ไม่ใช่ string)
            to: (value: number) => value,
            from: (value: string | null) => (value ? parseFloat(value) : 0),
        },
    })
    unit_cost_inv: number;

    /** ราคาต่อหน่วย (Unit Cost) */
    @Column({
        type: 'decimal',
        precision: 15, // รวมจำนวนหลักทั้งหมด เช่น 999,999,999,999.99
        scale: 2,      // จำนวนหลักทศนิยม (2 = เก็บทศนิยม 2 ตำแหน่ง)
        default: 0,
        comment: 'Total Cost (Materials in Inventory)',
        transformer: {
            // optional — เพื่อให้เวลาดึงจาก DB กลับมาเป็น number (ไม่ใช่ string)
            to: (value: number) => value,
            from: (value: string | null) => (value ? parseFloat(value) : 0),
        },
    })
    total_cost_inv: number;

    /** ORG ID */
    @Column({ type: 'varchar', length: 20, nullable: true, default: null, comment: 'ORG ID'})
    org_id?: string;
    
     /** Department */
    @Column({ type: 'varchar', length: 255, nullable: true, default: null, comment: 'Department'})
    dept?: string;

    /** จำนวนใน inventory */
    @Column({ type: 'int', nullable: true, default: 0, comment: 'Inventory Quantity' })
    inv_qty!: number;

    /** FK เชื่อมกับ inventory summary */
    @Column({ type: 'int', unsigned: true })
    sum_inv_id!: number;

    /** stock_status */
    @Column({ nullable: false, default: true })
    is_active: boolean;

    /** created_at */
    @Column({
        type: 'timestamp',
        default: () => 'CURRENT_TIMESTAMP',
        comment: 'Inventory created at (first receipt time)'
    })
    created_at!: Date;

    /** updated_at */
    @Column({ type: 'timestamp',  default: () => 'CURRENT_TIMESTAMP', comment: 'Requested at' })
    updated_at!: Date;

}