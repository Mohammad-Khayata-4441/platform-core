# Auth queries go through a delegate the app passes in

Sign-in needs users and sessions, so it cannot stay a pure cookie helper. It also must not import `@core/db-prisma`. The auth package defines a minimal delegate for the queries it runs, and the app passes its Prisma accessors in. The package owns the query logic. The app owns the client and the schema.

Putting login only in `apps/api` was rejected because every new product would copy it. Importing the Prisma client into `@core/auth` was rejected because the dashboard already depends on that package and must not take a database dependency.
