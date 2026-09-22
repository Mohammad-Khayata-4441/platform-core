/**
 * Base CRUD domain event.
 * All resource lifecycle events extend this class.
 */
export class CrudEvent<T = unknown> {
  constructor(
    public readonly tenantId: string,
    public readonly resourceName: string,
    public readonly payload: T,
    public readonly timestamp: Date = new Date(),
  ) {}
}

/**
 * Fired after a resource is successfully created.
 * Event name pattern: `{resource}.created`  (e.g. `unit.created`)
 */
export class ResourceCreatedEvent<T = unknown> extends CrudEvent<T> {
  static eventName(resource: string): string {
    return `${resource}.created`;
  }
}

/**
 * Fired after a resource is successfully updated.
 * Event name pattern: `{resource}.updated`
 */
export class ResourceUpdatedEvent<T = unknown> extends CrudEvent<T> {
  static eventName(resource: string): string {
    return `${resource}.updated`;
  }

  constructor(
    tenantId: string,
    resourceName: string,
    payload: T,
    public readonly previous: T,
  ) {
    super(tenantId, resourceName, payload);
  }
}

/**
 * Fired after a resource is successfully deleted.
 * Event name pattern: `{resource}.deleted`
 */
export class ResourceDeletedEvent<T = unknown> extends CrudEvent<T> {
  static eventName(resource: string): string {
    return `${resource}.deleted`;
  }
}
