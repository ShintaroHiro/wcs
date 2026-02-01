import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

/**
 * order return ย่อย: ใช้เก็บข้อมูล order return inventory อ้างอิง inv_id รายตัว
 */
@Entity({ name: 'return_inventory' })
export class ReturnInventory {
    /** รหัสงาน (PK) */
    @PrimaryGeneratedColumn({ type: 'int', unsigned: true, comment: 'Primary key of order return inv' })
    return_inv_id: number;
    
    /** FK Orders return */
    @Column({ type: 'int', nullable: true })
    return_id?: number;

    /** FK Usage_inventory (ของที่เคยเบิก) มากับ barcode*/
    @Column({ type: 'int', nullable: true })
    usage_inv_id?: number;

    /** จำนวนคืนย่อย */
    @Column({ type: 'int', nullable: true, default: 0 })
    return_qty?: number;

    /** FK Usage_inventory (inventory ที่รับคืนเข้า) */
    @Column({ type: 'int', nullable: true })
    new_inv_id?: number;
}