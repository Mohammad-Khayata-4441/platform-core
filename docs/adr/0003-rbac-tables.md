# Roles and permissions are stored, and the catalog is code

A role is a row. A permission is a row, keyed by the catalog. A role grants permissions through a join table. A user may hold many roles. Nothing in these tables has a tenant column.

On boot the catalog is upserted into the permission table. The core's own keys are listed in [0009](./0009-core-permission-catalog.md). A product appends its own keys to that same sync. The only system role the core ships is `owner`, decided in [0005](./0005-owner-role.md). The ERP's Accountant, Sales, Inventory, and Viewer roles are not copied: those names belong to an accounting product.

Slug-only roles, with the permission map living only in code, were rejected. An operator could not change what a role allows without a deploy. A permission table that the database invents, with no code catalog, was rejected because the guard would then allow actions the application does not implement.
