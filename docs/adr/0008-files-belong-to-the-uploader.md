# A file belongs to the user who uploaded it

A file stores its name, type, size, path, and the url the driver returned at upload. The uploader is required. There is no tenant column and no store column. The package runs the queries through a Prisma delegate the app passes in. A local driver and an S3 driver both ship, and the environment picks one.

e-dukan's `storeId` and the ERP's required `tenantId` were rejected. A store is a product concept, and a tenant is already a separate database. Shipping only the local driver was rejected because both source apps already split the storage behind an interface, and the second driver is how a product turns S3 on.
