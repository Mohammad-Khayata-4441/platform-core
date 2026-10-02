/** Core permission keys. A product appends its own keys to the same boot sync. ADR 0009. */
export const CORE_PERMISSION_KEYS = [
  'users.read',
  'users.update',
  'users.deactivate',
  'roles.read',
  'roles.create',
  'roles.update',
  'roles.assign',
  'files.create',
  'files.read',
  'files.delete',
] as const;

/** System role slug. Boot finds the role by this slug, never by its label. ADR 0006. */
export const OWNER_ROLE_SLUG = 'owner';

/** Label used only when boot creates the owner role. An existing label is left alone. */
export const OWNER_ROLE_LABEL = { en: 'Owner' };
