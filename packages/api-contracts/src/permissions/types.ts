/**
 * Branded string. The consuming app supplies the concrete union via module
 * augmentation (declaration merging) so `PermissionKey` stays a plain string at
 * the core level while apps get autocompletion and typo-safety.
 */
export type PermissionKey = string & { readonly __permissionKey?: unique symbol };

export interface RolePermissionMap {
  [role: string]: PermissionKey[];
}
