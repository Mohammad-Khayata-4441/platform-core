# A role is found by its slug

A role has a stable slug and a translated label. Boot finds the system role by the slug `owner`. Renaming the label does not create another owner. A product's own role gets its own slug.

Finding a role by its Arabic display name, which is what the ERP does, was rejected. A rename then fails the next boot, or collides with a role a person created by hand.
