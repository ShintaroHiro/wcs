import { Entity, PrimaryGeneratedColumn, Column, Index } from 'typeorm';

@Entity({ name: 'counter' })
export class Counter {

    @PrimaryGeneratedColumn({ type: 'int', unsigned: true })
    counter_id!: number;

    @Column({ type: 'varchar', length: 32, nullable: true })
    code?: string;

    /** Empty / WAITING_AMR / READY_TO_PICK / ERROR */
    @Column({ type: 'enum', enum: ['EMPTY','WAITING_AMR','READY_TO_PICK','ERROR','WAITING_PICK'] })
    status!: string;

    /** สีของ execution group ที่ lock counter นี้ */
    @Column({ type: 'varchar', length: 20, nullable: true })
    group_color?: string;

    @Column({ type: 'varchar', length: 7, nullable: true })
    light_color_hex?: string;

    @Column({ type: 'enum', enum: ['OFF','ON','BLINK'] })
    light_mode!: string;

    @Column({ default: false })
    gate_open!: boolean;

    @Column({ type: 'int', unsigned: true, nullable: true })
    current_order_id?: number;

    @Column({ type: 'int', unsigned: true, nullable: true })
    current_wrs_id?: number;

    @Column({ type: 'timestamp', nullable: true })
    last_event_at?: Date;
}
