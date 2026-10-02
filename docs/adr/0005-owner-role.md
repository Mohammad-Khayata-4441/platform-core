# The first user is the owner

The core ships one system role, `owner`. Boot grants it every permission in the catalog, and repeats that grant on every boot. The first user to register receives `owner`. Later users receive no role until an owner assigns one. Roles the product creates are not rewritten. The role is found by its slug, and the last active owner cannot be removed, per [0006](./0006-role-slug.md) and [0007](./0007-last-owner.md).

Seeding the ERP's Accountant, Sales, Inventory, and Viewer roles was rejected. Those are accounting jobs, not properties of a kernel. Shipping no role at all was rejected because an empty database would have permissions and nobody allowed to use them.
