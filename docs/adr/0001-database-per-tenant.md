# Database per tenant

A tenant is a separate deployment with its own database. The core schema has no `tenantId` and no `Tenant` model.

Row-level tenancy, as in the ERP, was rejected. A shared database with a tenant column forces every query to remember the scope, and this core is meant to be copied into products that already isolate customers by database. e-dukan's store membership is a product concept, not a stand-in for a tenant.
