import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";
import { StatusOrders, TaskReason, TaskSource, TaskSubsystem, TypeInfm } from "../common/global.enum";

//เก็บทุก event ที่เกิดขึ้นรวมถึง clear error
@Entity({ name: 's_events' })
export class Events {
    @PrimaryGeneratedColumn()
    id: number;

    //ERROR / EVENT
    @Column({ type: 'varchar', length: 50, nullable: true })
    type: string;

    /** Equipment ex. WRS, ORDERS, SESSION(Login) */
    @Column({ type: 'varchar', length: 50, nullable: true })
    category: string;

    @Column({ type: 'varchar', length: 255, nullable: true })
    event_code: string;

    /** Detail */
    @Column({ type: 'varchar', length: 255, nullable: true })
    message: string;

    /** ไอดีที่เกี่ยวข้อง โดยดู type จาก category */
    @Column({ type: 'int', unsigned: true, nullable: true })
    related_id: number;

    /** INFO, WARNING, ERROR */
    @Column({ type: 'varchar', length: 50, nullable: true })
    level: string;

    /** ACTIVE, CLEARED */
    @Column({ type: 'varchar', length: 50, nullable: true })
    status: string;

    /** Clear Error */
    @Column({
        type: 'boolean',
        default: true,
        comment: 'true = cleared(ไม่มี error แล้ว)'
        })
    is_cleared: boolean;

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    created_at: Date;

    @Column({ type: 'varchar', length: 50, nullable: true, comment: 'Created username' })
    created_by: string;

    @Column({ type: 'timestamp', nullable: true })
    cleared_at?: Date;

    @Column({ type: 'varchar', length: 50, nullable: true, comment: 'Created username' })
    cleared_by: string;
}
