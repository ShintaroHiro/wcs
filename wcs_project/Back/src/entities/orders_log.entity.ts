import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";
import { StatusOrders, TaskReason, TaskSource, TaskSubsystem, TypeInfm } from "../common/global.enum";

@Entity({ name: 'orders_log' })
export class OrdersLog {
    @PrimaryGeneratedColumn({ type: 'int', unsigned: true })
    id!: number;

    @Column({ type: 'int', unsigned: true })
    order_id!: number;

    /** ประเภท: Inbound(Receipt) or Outbound(Usage) or Transfer */
    @Column({ type: 'enum', enum: TypeInfm, comment: 'Type of the task' })
    type!: TypeInfm;

    /** ไอดี stock item (Fk) */
    @Column({ type: 'int', unsigned: true, nullable: true })
    item_id: number | null;

    /** stock item (Fk) */
    @Column({ type: 'varchar', length: 100, nullable: true, comment: 'Requested material(SKU)' })
    stock_item: string | null;

    /** คำอธิบายสินค้า */
    @Column({ type: 'varchar', length: 255, nullable: true, default: null, comment: 'Item description' })
    item_desc: string | null;

    /** ไอดี location (Fk) */
    @Column({ type: 'int', unsigned: true, nullable: true })
    loc_id: number | null;

    /** location */
    @Column({ type: 'varchar', length: 100, nullable: true, default: null, comment: 'location' })
    loc: string | null;

    /** box location */
    @Column({ type: 'varchar', length: 100, nullable: true, default: null, comment: 'box location' })
    box_loc: string | null;

    /** ไอดี location relate for Transfer(Fk) */
    @Column({ type: 'int', unsigned: true, nullable: true })
    to_loc_id: number | null;

    /** location relate*/
    @Column({ type: 'varchar', length: 100, nullable: true, default: null, comment: 'location' })
    to_loc: string | null;

    /** box location relate*/
    @Column({ type: 'varchar', length: 100, nullable: true, default: null, comment: 'box location' })
    to_box_loc: string | null;

    /** สภาพสินค้า เช่น NEW หรือ CAPITAL */
    @Column({ type: 'varchar', length: 50, nullable: true, comment: 'Item condition (NEW / CAPITAL)' })
    cond: string | null;

    /** จำนวนที่ต้องการ */
    @Column({ type: 'int', default: 0, comment: 'Plan Quantity' })
    plan_qty!: number;

    /** จำนวนที่ยิงจริง */
    @Column({ type: 'int', nullable: true, default: 0, comment: 'Actual Quantity' })
    actual_qty?: number;

    @Column({ type: 'enum', enum: StatusOrders, nullable: true, default: null })
    status: StatusOrders | null;

    /** สถานะการคอนเฟิร์ม */
    @Column({ default: false })
    is_confirm: boolean;

    @Column({ type: 'varchar', length: 50, nullable: true, default: null })
    actor: string | null; // admin 

    @Column({ type: 'varchar', length: 50, nullable: true, default: null })
    source?: TaskSource | null; // API / DISPATCHER / GATEWAY

    @Column({ type: 'varchar', length: 255, nullable: true })
    message: string | null;

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    created_at: Date;
}
