import { Entity, PrimaryGeneratedColumn, Column, Index } from 'typeorm';
import { ExecutionMode, ScanStatus, StatusOrders, TypeInfm } from '../common/global.enum';

/**
 * order: ใช้เก็บรายการที่ต้องการทำ execution ทั้งหมด รวมทั้ง MRS และ WRS
 */
@Entity({ name: 'orders' })
export class Orders {
    /** รหัสงาน (PK) */
    @PrimaryGeneratedColumn({ type: 'int', unsigned: true, comment: 'Primary key of order task' })
    order_id!: number;

    /** ประเภท: Inbound(Receipt) or Outbound(Usage) or Transfer */
    @Column({ type: 'enum', enum:TypeInfm, comment: 'Type of the task' })
    type!: TypeInfm;

    /** ประเภทคลัง: T1 (WRS) หรือ T1M (MRS) หรือ AGMB*/
    @Column({ type: 'varchar', length: 50, nullable: true, comment: 'Store type of the stock item location' })
    store_type: string | null;

    /** สำหรับจัดกลุ่ม order ที่ execution */
    @Column({ type: 'varchar', length: 50, nullable: true })
    execution_group_id: string | null;

    /** สถานะงานที่รอ */
    @Column({ type: 'enum',enum:StatusOrders ,default: StatusOrders.WAITING, comment: 'Overall order task state'})
    status!: StatusOrders;

    /** ไอดี stock item (Fk m_stock_items) */
    @Column({ type: 'int', unsigned: true })
    item_id!: number;

    /** เก็บ group code เอาไว้ filter ว่า ใครเห็น order ไหน*/
    @Column({ type: 'varchar', length: 50, nullable: true, comment: 'Maintenance contract' })
    mc_code: string | null;

    /** ไอดี location (Fk) */
    @Column({ type: 'int', unsigned: true })
    loc_id!: number;

    /** สภาพสินค้า เช่น NEW หรือ CAPITAL */
    @Column({ type: 'varchar', length: 50, nullable: true, comment: 'Item condition (NEW / CAPITAL)' })
    cond: string | null;

    /** จำนวนที่ต้องการ */
    @Column({ type: 'int', nullable: false, comment: 'Plan Quantity' })
    plan_qty!: number;
    
    /** จำนวนที่ยิงจริง */
    @Column({ type: 'int', nullable: true, default: 0, comment: 'Actual Quantity' })
    actual_qty?: number;

    /** สถานะที่แสกน */
    @Column({  type: 'enum', enum: ScanStatus , nullable: false, default: ScanStatus.PENDING  })
    actual_status: ScanStatus;

    /** ผู้ร้องขอแสกนของ */
    @Column({ type: 'varchar', length: 50, nullable: true })
    actual_by: string | null;

    /** สถานะการคอนเฟิร์ม */
    @Column({ default: false, nullable: false })
    is_confirm: boolean;

    /** ผู้ร้องขอ */
    @Column({ type: 'varchar', length: 50, nullable: true, comment: 'Requester username' })
    requested_by: string | null;

    /** เวลารับคำขอ */
    @Column({ type: 'timestamp',  default: () => 'CURRENT_TIMESTAMP', comment: 'Requested at' })
    requested_at!: Date;

    /** ผู้แก้ไข */
    @Column({ type: 'varchar', length: 50, nullable: true, comment: 'Update username' })
    updated_by: string | null;

    /** เวลาอัปเดตล่าสุดของงาน ตาม log*/
    @Column({  type: 'timestamp',  nullable: true, default: () => null })
    updated_at?: Date;   

    /** เวลาที่เข้าคิว */
    @Column({ type: 'timestamp',  nullable: true, default: () => null})
    queued_at?: Date;
        
    /** เวลาที่เริ่มทำออเดอร์ */
    @Column({ type: 'timestamp',  nullable: true, default: () => null})
    started_at?: Date;
    
    /** เวลาเสร็จออเดอร์ = ตอนยิงของ */
    @Column({ type: 'timestamp',  nullable: true, default: () => null, comment: 'Finished date' })
    finished_at?: Date;

    /** ลำดับความสำคัญ 1–9 (น้อย→มาก) */
    @Column({ type: 'tinyint', unsigned: true, default: 5, comment: 'Priority 1-9 (low→high)' })
    priority!: number;

    /** โค้ด/ข้อความความผิดพลาด (ระดับงานรวม) */
    @Column({ type: 'varchar', length: 50, nullable: true, comment: 'Error code (if failed)' })
    error_code: string | null;

    @Column({ type: 'varchar', length: 255, nullable: true, comment: 'Error message (if failed)' })
    error_msg: string | null;

    /** ไอดี user_id ที่สร้าง order*/
    @Column({ type: 'int', unsigned: true })
    created_by_user_id: number;

    /** ไอดี user_id ที่ execute order ไว้กำกับสี คือถ้า user_id เดียวกันให้สีเดียวกัน*/
    @Column({ type: 'int', unsigned: true, nullable: true, })
    executed_by_user_id?: number;

    /** ผู้ร้องขอ import เท่านั้น */
    @Column({ type: 'varchar', length: 50, nullable: true, comment: 'Requester username importer' })
    import_by: string | null;

    /** การ import ถ้า 1=import ถ้า0=ไม่import*/
    @Column({ default: false, nullable: false })
    is_import: boolean;

    /** ประเภทของ transfer 1.INTERNAL → source == target(INTERNAL_OUT/INTERNAL_IN) 2.OUTBOUND → source = own, target = external 3.INBOUND → source = external, target = own*/
    @Column({ type: 'varchar', length: 20, nullable: true, comment: 'Type of Transfer Scenario' })
    transfer_scenario?: string;
    
    /** ประเภทของการ execution คือ AUTO(execute normal) , MANUAL(update inventory) */
    @Column({
    type: 'enum',
    enum: ExecutionMode,
    default: ExecutionMode.AUTO,
    nullable: false,
    comment: 'Execution mode: AUTO (execute normal) or MANUAL (update inventory)',
    })
    execution_mode!: ExecutionMode;

}