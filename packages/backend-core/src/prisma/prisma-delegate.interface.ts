import type { Prisma } from '@core/db-prisma';

/** Delegate operations the CRUD repository base calls. */
export type PrismaDelegateOperation =
  | 'findMany'
  | 'findFirst'
  | 'findUnique'
  | 'create'
  | 'update'
  | 'delete'
  | 'count';

/**
 * Structural adapter every generated Prisma model delegate satisfies
 * (e.g. `Prisma.UnitDelegate`).
 *
 * The method arguments are loose on purpose: the checked input types are
 * derived from the concrete delegate through {@link PrismaDelegateArgs}, so
 * the repository seam stays honest without this interface having to restate
 * every model's argument shapes.
 */
export interface PrismaModelDelegate {
  findMany(args?: any): Promise<any>;
  findFirst(args?: any): Promise<any>;
  findUnique(args: any): Promise<any>;
  create(args: any): Promise<any>;
  update(args: any): Promise<any>;
  delete(args: any): Promise<any>;
  count(args?: any): Promise<any>;
}

/** The `args` bag Prisma's delegate takes for one operation, via Prisma's own helper. */
export type PrismaDelegateArgs<D, O extends PrismaDelegateOperation> = Prisma.Args<D, O>;

/** A single field of an operation's `args` (e.g. `where`, `orderBy`, `include`). */
export type PrismaDelegateArgField<D, O extends PrismaDelegateOperation, F extends string> =
  PrismaDelegateArgs<D, O> extends { [K in F]?: infer V } ? V : any;

/** The `data` payload for a create/update operation, derived from the delegate. */
export type PrismaDelegateData<D, O extends 'create' | 'update'> =
  PrismaDelegateArgs<D, O> extends { data: infer V } ? V : Record<string, any>;
