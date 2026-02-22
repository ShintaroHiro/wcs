import { EntityManager } from "typeorm";
import { AppDataSource } from "../config/app-data-source";
import { WrsLog } from "../entities/wrs_log.entity";
import { ControlSource } from "../common/global.enum";

export class WrsLogService {

    async createLog(
        manager: EntityManager | null,
        data: {
            wrs_id: number;
            order_id?: number;
            status: string;
            operator?: ControlSource;
            event: string;
            message?: string;
        }
    ): Promise<void> {

        const repo = manager
            ? manager.getRepository(WrsLog)
            : AppDataSource.getRepository(WrsLog);

        await repo.insert({
            wrs_id: data.wrs_id,
            order_id: data.order_id,
            status: data.status,
            operator: data.operator ?? ControlSource.AUTO,
            event: data.event,
            message: data.message
        });
    }
}