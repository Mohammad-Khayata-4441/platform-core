/**
 * Abstract presenter / mapper base class.
 *
 * A presenter transforms a raw Prisma entity into a serialized response DTO.
 * Extend this class and implement `toResponse()`:
 * ```ts
 * @Injectable()
 * export class UnitPresenter extends CrudPresenter<Unit, UnitResponseDto> {
 *   toResponse(entity: Unit): UnitResponseDto {
 *     return { id: entity.id, name: entity.name, abbreviation: entity.abbreviation, isActive: entity.isActive };
 *   }
 * }
 * ```
 */
type Decimal = { toNumber(): number } | number;

export abstract class CrudPresenter<TEntity, TResponse> {
  /** Map a single entity to its response shape. */
  abstract toResponse(entity: TEntity): TResponse;

  /** Map an array of entities to their response shapes. */
  toResponseList(entities: TEntity[]): TResponse[] {
    return entities.map((entity) => this.toResponse(entity));
  }

  /**
   * Convert a Prisma Decimal to a JS number.
   * Known limitation: loses exactness above 2^53.
   */
  protected static toNum(d: Decimal | null | undefined): number {
    if (d == null) return 0;
    return typeof d === 'object' ? d.toNumber() : d;
  }
}
