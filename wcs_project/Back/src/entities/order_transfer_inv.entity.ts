import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

/**
 * ใช้เฉพาะตอน transfer pick
 */
@Entity({ name: 'transfer_inventory' })
export class TransferInventory {
    /** รหัสงาน (PK) */
    @PrimaryGeneratedColumn({ type: 'int', unsigned: true, comment: 'Primary key of order transfer inventory id' })
    transfer_inv_id: number;

    /** FK Transfer */
    @Column({ type: 'int', nullable: true })
    transfer_id?: number;

    /** FK Inventory */
    @Column({ type: 'int', nullable: true })
    inv_id?: number;

    /** จำนวนเบิกย่อย */
    @Column({ type: 'int', nullable: true, default: 0 })
    transfer_qty?: number;

}