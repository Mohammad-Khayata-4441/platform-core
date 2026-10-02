# Platform core

The shared, domain-free kernel a new product starts from. A product adds its own business concepts on top. The kernel does not contain them.

## Language

**User**:
A person who can log in to this platform.
_Avoid_: customer, merchant, guest, tenant member, app user

**Tenant**:
One deployment of the platform, with its own database. The schema has no tenant row and no tenant column.
_Avoid_: organization, store, account

**Permission**:
One action the platform can allow or deny. The core declares the actions for users, roles, and files. A product declares the rest. A copy of each is stored so a role can grant it.
_Avoid_: privilege, scope, claim

**Role**:
A named bundle of permissions that can be assigned to a User. A User may hold more than one role.
_Avoid_: merchant, customer, guest, global role

**System role**:
A role the platform defines and finds by a stable slug. Its label can be translated. Its permissions are reset from the code catalog on every boot. The core ships one system role, `owner`. The first User to register receives it. The last active owner cannot lose that role and cannot be deactivated. Roles a product creates are left alone.
_Avoid_: super admin, administrator

**File**:
An object uploaded by a User. The uploader is part of the file.
_Avoid_: attachment, media, document, store file
