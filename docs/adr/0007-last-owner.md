# The last active owner cannot be removed

The last user who holds `owner` and is still active cannot lose that role and cannot be deactivated. A second owner can demote or deactivate the first. Any other user can lose every role.

Allowing the last owner to demote themselves was rejected. The database would keep the permission catalog and have nobody left who can assign it.
