import { EntityManager } from "typeorm";
import { Events } from "../entities/s_events.entity";
import { AppDataSource } from "../config/app-data-source";
import { Events_TM } from "../entities/s_events_tm.entity";
import { Events_Agmb } from "../entities/s_events_agmb.entity";

export class EventService {

    async createEvent(
        manager: EntityManager | null,
        data: {
            type: string;
            category: string;
            event_code: string;
            message?: string;
            related_id?: number;
            level?: string;
            status?: string;
            created_by?: string;
        }
    ) {
        const repo = manager
            ? manager.getRepository(Events)
            : AppDataSource.getRepository(Events);

        const event = repo.create({
            type: data.type,
            category: data.category,
            event_code: data.event_code,
            message: data.message ?? '',
            related_id: data.related_id,
            level: data.level ?? 'INFO',
            status: data.status ?? 'ACTIVE',
            created_by: data.created_by?.trim() || 'SYSTEM',
        });

        await repo.save(event);
    }

    async createEventT1M(
        manager: EntityManager | null,
        data: {
            type: string;
            category: string;
            event_code: string;
            message?: string;
            related_id?: number;
            level?: string;
            status?: string;
            created_by?: string;
        }
    ) {
        const repo = manager
            ? manager.getRepository(Events_TM)
            : AppDataSource.getRepository(Events_TM);

        const event = repo.create({
            type: data.type,
            category: data.category,
            event_code: data.event_code,
            message: data.message ?? '',
            related_id: data.related_id,
            level: data.level ?? 'INFO',
            status: data.status ?? 'ACTIVE',
            created_by: data.created_by?.trim() || 'SYSTEM',
        });

        await repo.save(event);
    }

    async createEventAgmb(
        manager: EntityManager | null,
        data: {
            type: string;
            category: string;
            event_code: string;
            message?: string;
            related_id?: number;
            level?: string;
            status?: string;
            created_by?: string;
        }
    ) {
        const repo = manager
            ? manager.getRepository(Events_Agmb)
            : AppDataSource.getRepository(Events_Agmb);

        const event = repo.create({
            type: data.type,
            category: data.category,
            event_code: data.event_code,
            message: data.message ?? '',
            related_id: data.related_id,
            level: data.level ?? 'INFO',
            status: data.status ?? 'ACTIVE',
            created_by: data.created_by?.trim() || 'SYSTEM',
        });

        await repo.save(event);
    }
}