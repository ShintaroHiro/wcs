import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

/**
 * order list: ใช้เก็บข้อมูล order transfer
 */
@Entity({ name: 'orders_transfer' })
export class OrdersTransfer {
    /** รหัสงาน (PK) */
    @PrimaryGeneratedColumn({ type: 'int', unsigned: true, comment: 'Primary key of order transfer' })
    transfer_id!: number;

    /** FK เชื่อมกับ Orders */
    @Column({ type: 'int', unsigned: true })
    order_id!: number;

    /** ไอดี location (Fk) โดย related_loc_id เก็บ to location เก็บINTERNAL_IN และ loc_id ใน Orders คือfrom location เก็บINTERNAL_OUT ใช้เฉพาะกรณี INTERNAL*/
    @Column({ type: 'int', unsigned: true, nullable: true, })
    related_loc_id: number;

    /** ราคาต่อหน่วย (Unit Cost) */
    @Column({
        type: 'decimal',
        precision: 15, // รวมจำนวนหลักทั้งหมด เช่น 999,999,999,999.99
        scale: 2,      // จำนวนหลักทศนิยม (2 = เก็บทศนิยม 2 ตำแหน่ง)
        default: 0,
        comment: 'Unit Cost (Materials to be handled)',
        transformer: {
            // optional — เพื่อให้เวลาดึงจาก DB กลับมาเป็น number (ไม่ใช่ string)
            to: (value: number) => value,
            from: (value: string | null) => (value ? parseFloat(value) : 0),
        },
    })
    unit_cost_handled: number;

    /** Object ID */
    @Column({ type: 'varchar', length: 20, nullable: true, comment: 'Object ID' })
    object_id?: string;

    /** เก็บ order id ของ transfer ที่อ้างถึง เฉพาะกรณี INTERNAL*/
    @Column({ type: 'int', unsigned: true, nullable: true })
    related_order_id?: number;

    /** status รวม */
    @Column({ type: 'varchar', length: 20, nullable: true, comment: 'status รวม ใช้เฉพาะ INTERNAL' })
    transfer_status?: string;

    /** FK เชื่อมกับ inventory summary ตอนสร้าง order pick*/
    @Column({ type: 'int', nullable: true })
    sum_inv_id?: number;

}