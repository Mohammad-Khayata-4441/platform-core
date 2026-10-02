# The core ships the permissions for its own resources

The permission catalog starts with the keys for users, roles, and files. A product appends its own keys. Boot upserts the union. The `owner` role is granted every key in that union. A custom role receives only the keys an owner assigns.

The core keys are `users.read`, `users.update`, `users.deactivate`, `roles.read`, `roles.create`, `roles.update`, `roles.assign`, `files.create`, `files.read`, and `files.delete`.

There is no `users.create` key. A person arrives by registering. There is no `roles.delete` key and no `files.update` key. A role is changed in place. A file is removed and uploaded again.

An empty catalog was rejected. `owner` would be granted nothing, and every product would invent its own name for reading a user or deleting a file.
