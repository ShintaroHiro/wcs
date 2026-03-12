import { Repository, EntityManager, QueryFailedError, Not } from 'typeorm';
import { AppDataSource } from '../config/app-data-source';
import { ApiResponse } from '../models/api-response.model';
import * as lang from '../utils/LangHelper'; // Import LangHelper for specific functions
import * as validate from '../utils/ValidationUtils'; // Import ValidationUtils

import { Locations } from '../entities/m_location.entity';

export class LocationMasterService {
    private locRepository: Repository<Locations>;

    constructor() {
        this.locRepository = AppDataSource.getRepository(Locations);
    }

    async create(
        data: Partial<Locations>,
        reqUsername: string,
        manager?: EntityManager
    ): Promise<ApiResponse<any>> {
        const response = new ApiResponse<Locations>();
        const operation = "LocationMasterService.create";

        const queryRunner = manager ? null : AppDataSource.createQueryRunner();
        const useManager = manager ?? queryRunner?.manager;

        if (!useManager) {
        return response.setIncomplete(
            lang.msg("validation.no_entityManager_or_queryRunner_available")
        );
        }

        if (!manager && queryRunner) {
        await queryRunner.connect();
        await queryRunner.startTransaction();
        }

        try {
        const repository = useManager.getRepository(Locations);

        // ✅ validation
        if (validate.isNullOrEmpty(data.store_type)) {
            throw new Error(lang.msgRequired("locations.store_type"));
        }
        if (validate.isNullOrEmpty(data.loc)) {
            throw new Error(lang.msgRequired("locations.loc"));
        }
        if (validate.isNullOrEmpty(data.box_loc)) {
            throw new Error(lang.msgRequired("locations.box_loc"));
        }

        // ✅ check duplicate
        const boxLoc = data.box_loc as string;

        const existing = await repository.findOne({
            where: {
                box_loc: boxLoc,
            },
        });

        if (existing) {
            throw new Error(lang.msgAlreadyExists("locations.box_loc"));
        }

        // ✅ create entity
        const locationData = repository.create({
            ...data,
            is_active: data.is_active ?? true,
            requested_at: new Date(),
            requested_by: reqUsername,
        });

        // ✅ save
        const savedData = await repository.save(locationData);

        if (!manager && queryRunner) {
            await queryRunner.commitTransaction();
        }

        return response.setComplete(
            lang.msgSuccessAction("created", "location data"),
            savedData
        );

        } catch (error: any) {

        if (!manager && queryRunner) {
            await queryRunner.rollbackTransaction();
        }

        console.error(`Error during ${operation}:`, error);

        if (error instanceof QueryFailedError) {
            return response.setIncomplete(
            lang.msgErrorFunction(operation, error.message)
            );
        }

        return response.setIncomplete(error.message);

        } finally {
        if (!manager && queryRunner) {
            await queryRunner.release();
        }
        }
    }


    async update(
        loc_id: number,
        data: Partial<Locations>,
        reqUsername: string,
        manager?: EntityManager
        ): Promise<ApiResponse<Locations>> {

        const response = new ApiResponse<Locations>();
        const operation = "LocationMasterService.update";

        const queryRunner = manager ? null : AppDataSource.createQueryRunner();
        const useManager = manager ?? queryRunner?.manager;

        if (!useManager) {
            return response.setIncomplete(
            lang.msg("validation.no_entityManager_or_queryRunner_available")
            );
        }

        if (!manager && queryRunner) {
            await queryRunner.connect();
            await queryRunner.startTransaction();
        }

        try {
            const repository = useManager.getRepository(Locations);

            const existingData = await repository.findOne({ where: { loc_id } });

            if (!existingData) {
            throw new Error(lang.msgNotFound("locations.loc_id"));
            }

            // ✅ validate (ถ้าบังคับส่งครบ)
            if (validate.isNullOrEmpty(data.store_type))
            throw new Error(lang.msgRequired("locations.store_type"));

            if (validate.isNullOrEmpty(data.loc))
            throw new Error(lang.msgRequired("locations.loc"));

            if (validate.isNullOrEmpty(data.box_loc))
            throw new Error(lang.msgRequired("locations.box_loc"));

            const boxLoc = data.box_loc as string;

            // ✅ check duplicate global box_loc
            if (boxLoc !== existingData.box_loc) {
            const duplicate = await repository.findOne({
                where: {
                box_loc: boxLoc,
                loc_id: Not(loc_id),
                },
            });

            if (duplicate) {
                throw new Error(lang.msgAlreadyExists("Source Box Location"));
            }
            }

            // ✅ merge + update
            repository.merge(existingData, {
            ...data,
            requested_at: new Date(),
            requested_by: reqUsername,
            });

            const saved = await repository.save(existingData);

            if (!manager && queryRunner) {
            await queryRunner.commitTransaction();
            }

            return response.setComplete(
            lang.msgSuccessAction("updated", "location data"),
            saved
            );

        } catch (error: any) {

            if (!manager && queryRunner) {
            await queryRunner.rollbackTransaction();
            }

            console.error(`Error during ${operation}:`, error);

            if (error instanceof QueryFailedError) {
            return response.setIncomplete(
                lang.msgErrorFunction(operation, error.message)
            );
            }

            return response.setIncomplete(error.message);

        } finally {
            if (!manager && queryRunner) {
            await queryRunner.release();
            }
        }
    }

    async delete(
        loc_id: number,
        manager?: EntityManager
        ): Promise<ApiResponse<void>> {

        const response = new ApiResponse<void>();
        const operation = "LocationMasterService.delete";

        const queryRunner = manager ? null : AppDataSource.createQueryRunner();
        const useManager = manager ?? queryRunner?.manager;

        if (!useManager) {
            return response.setIncomplete(
            lang.msg("validation.no_entityManager_or_queryRunner_available")
            );
        }

        if (!manager && queryRunner) {
            await queryRunner.connect();
            await queryRunner.startTransaction();
        }

        try {
            const repository = useManager.getRepository(Locations);

            const existing = await repository.findOne({ where: { loc_id } });

            if (!existing) {
            throw new Error(lang.msgNotFound("Source Box Location"));
            }

            await repository.delete(loc_id);

            if (!manager && queryRunner) {
            await queryRunner.commitTransaction();
            }

            return response.setComplete(
            lang.msgSuccessAction("deleted", "location data")
            );

        } catch (error: any) {

            if (!manager && queryRunner) {
            await queryRunner.rollbackTransaction();
            }

            console.error(`Error during ${operation}:`, error);

            if (error instanceof QueryFailedError) {
            return response.setIncomplete(
                lang.msgErrorFunction(operation, error.message)
            );
            }

            return response.setIncomplete(error.message);

        } finally {
            if (!manager && queryRunner) {
            await queryRunner.release();
            }
        }
    }

    async deleteAll(manager?: EntityManager): Promise<ApiResponse<void>> {
        const response = new ApiResponse<void>();
        const operation = "LocationMasterService.deleteAll";

        const queryRunner = manager ? null : AppDataSource.createQueryRunner();
        const useManager = manager ?? queryRunner?.manager;

        if (!useManager) {
            return response.setIncomplete(
            lang.msg("validation.no_entityManager_or_queryRunner_available")
            );
        }

        if (!manager && queryRunner) {
            await queryRunner.connect();
            await queryRunner.startTransaction();
        }

        try {
            const repository = useManager.getRepository(Locations);

            const count = await repository.count();

            if (count === 0) {
            throw new Error(lang.msgNotFound("locations.data"));
            }

            // 🔥 ลบทั้งหมด
            await repository.clear(); 
            // clear() = TRUNCATE (เร็วกว่า delete())

            if (!manager && queryRunner) {
            await queryRunner.commitTransaction();
            }

            return response.setComplete(
            lang.msgSuccessAction("deleted", "all location data")
            );

        } catch (error: any) {

            if (!manager && queryRunner) {
            await queryRunner.rollbackTransaction();
            }

            console.error(`Error during ${operation}:`, error);

            if (error instanceof QueryFailedError) {
            return response.setIncomplete(
                lang.msgErrorFunction(operation, error.message)
            );
            }

            return response.setIncomplete(error.message);

        } finally {
            if (!manager && queryRunner) {
            await queryRunner.release();
            }
        }
    }


    async getAll(manager?: EntityManager): Promise<ApiResponse<any | null>> {
        const response = new ApiResponse<any | null>();
        const operation = 'LocationMasterService.getAll';

        try {
            const repository = manager
                ? manager.getRepository(Locations)
                : this.locRepository;

            const rawData = await repository
                .createQueryBuilder('locs')
                .select([
                    'locs.loc_id AS loc_id',
                    'locs.store_type AS store_type',
                    'locs.loc AS loc',
                    'locs.box_loc AS box_loc',

                ])
                .orderBy('locs.store_type', 'ASC')
                .addOrderBy('locs.loc', 'ASC')
                .addOrderBy('locs.box_loc', 'ASC')
                .cache(false)
                .getRawMany();

            if (!rawData || rawData.length === 0) {
                return response.setIncomplete(lang.msgNotFound('location data'));
            }

            return response.setComplete(
                lang.msgFound('location data'),
                rawData
            );

        } catch (error: any) {
            console.error('Error in getAll:', error);

            if (error instanceof QueryFailedError) {
                return response.setIncomplete(
                    lang.msgErrorFunction(operation, error.message)
                );
            }

            throw new Error(lang.msgErrorFunction(operation, error.message));
        }
    }

    
    async getById(
        loc_id: number,
        manager?: EntityManager
        ): Promise<ApiResponse<any | null>> {

        const response = new ApiResponse<any | null>();
        const operation = 'LocationMasterService.getById';

        try {
            const repository = manager
            ? manager.getRepository(Locations)
            : this.locRepository;

            const rawData = await repository
            .createQueryBuilder('locs')
            .select([
                'locs.loc_id AS loc_id',
                'locs.store_type AS store_type',
                'locs.loc AS loc',
                'locs.box_loc AS box_loc',
                "DATE_FORMAT(locs.requested_at, '%d/%m/%Y') AS requested_at",
            ])
            .where('locs.is_active = :isActive', { isActive: true })
            .andWhere('locs.loc_id = :loc_id', { loc_id }) // ✅ number
            .getRawOne();

            // ไม่พบข้อมูล
            if (!rawData) {
            return response.setIncomplete(lang.msgNotFound('locations.loc_id'));
            }

            return response.setComplete(
            lang.msgFound('locations.loc_id'),
            rawData
            );

        } catch (error: any) {
            console.error(`Error during ${operation}:`, error.message);

            if (error instanceof QueryFailedError) {
            return response.setIncomplete(
                lang.msgErrorFunction(operation, error.message)
            );
            }

            throw new Error(
            lang.msgErrorFunction(operation, error.message)
            );
        }
    }

    async searchLocations(
        loc?: string,
        box_loc?: string
    ): Promise<ApiResponse<any[]>> {
        const response = new ApiResponse<any[]>();
        const operation = 'LocationMasterService.searchLocations';

        try {
            // 🔥 ป้องกันค่าว่าง "" (ให้กลายเป็น undefined)
            loc = loc?.trim() || undefined;
            box_loc = box_loc?.trim() || undefined;

            const query = this.locRepository.createQueryBuilder('location')
                .select([
                    'location.loc_id AS loc_id',
                    'location.loc AS loc',
                    'location.box_loc AS box_loc',
                ]);

            if (validate.isNotNullOrEmpty(loc)) {
                query.andWhere('LOWER(location.loc) LIKE LOWER(:loc)', { loc: `%${loc}%` });
            }

            if (validate.isNotNullOrEmpty(box_loc)) {
                query.andWhere('LOWER(location.box_loc) LIKE LOWER(:box_loc)', { box_loc: `%${box_loc}%` });
            }

            const location = await query.getRawMany();

            if (!Array.isArray(location) || location.length === 0) {
                return response.setIncomplete(lang.msgNotFound('location'));
            }

            return response.setComplete(lang.msgFound('location'), location);

        } catch (error: any) {
            console.error(`Error in ${operation}:`, error);
            throw new Error(lang.msgErrorFunction(operation, error.message));
        }
    }

    }