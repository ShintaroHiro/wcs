import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";

/** 
 * เก็บข้อมูลตอนผูก user กับ Maintenance Contract 
 * ความสัมพันธ์ many to many ทำเผื่อไว้
 * filter ว่า ใครเห็น order ไหน
*/
@Entity({ name: "s_user_permis_group" })
export class s_user_permis_group {
    @PrimaryGeneratedColumn()
    upg_id: number;

    @Column()
    mc_code: string; // FK -> m_order maintenance contract

    @Column()
    user_id: number; // FK -> s_user
}
