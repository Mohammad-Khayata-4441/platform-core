import { BadRequestException } from '@nestjs/common';

export type QueryParams = {
    page?: number;
    limit?: number;
    sort?: string;      // ex: "createdAt:desc"
    filters?: Record<string, any>; // ex: { email: { $contains: "@gmail.com" } }
};

export class PrismaQueryBuilder {
    static build(params: QueryParams) {
        const { page = 1, limit = 10, sort, filters } = params;

        // 1. Pagination
        const take = Number(limit);
        const skip = (Number(page) - 1) * take;

        // 2. Sorting
        let orderBy = {};
        if (sort) {
            const [field, direction] = sort.split(':');
            if (!field || !direction) throw new BadRequestException('Invalid sort format');
            orderBy = { [field]: direction };
        } else {
            orderBy = { createdAt: 'desc' }; // Default sort if exists
        }

        const where = this.parseFilters(filters);

        return {
            skip,
            take,
            orderBy,
            where,
        };
    }

    private static parseFilters(filters?: Record<string, any>) {
        if (!filters) return {};

        const where: any = {};

        Object.keys(filters).forEach((field) => {
            const value = filters[field];


            if (typeof value === 'object' && !Array.isArray(value)) {
                where[field] = {};
                Object.keys(value).forEach((op) => {
                    const prismaOp = op.replace('$', ''); // $contains -> contains
                    where[field][prismaOp] = value[op];
                });
            } else {
                // Direct equality
                where[field] = value;
            }
        });

        return where;
    }
}