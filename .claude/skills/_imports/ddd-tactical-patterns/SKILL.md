---
name: "ddd-tactical-patterns"
description: "Apply DDD tactical patterns in code using entities, value objects, aggregates, repositories, and domain events with explicit invariants. | ERP trigger: Load when designing a new domain (catalog, accounting, inventory, …) or refining aggregates/value-objects/domain events."
source: "sickn33/antigravity-awesome-skills"
upstream_sha: "0b287bd181bb985ea7ff43e98d83b1f8e9f29639"
upstream_path: "skills/ddd-tactical-patterns/SKILL.md"
license: "MIT"
imported_with: "scripts/wrap-imported-skills.mjs"
---

# ddd-tactical-patterns — ERP Wrapper

> Imported from `sickn33/antigravity-awesome-skills` @ `0b287bd` (MIT).
> Upstream body preserved verbatim in `UPSTREAM.md`.
> Do not edit body content here — refresh via the script instead.

## When to use in this ERP

Load when designing a new domain (catalog, accounting, inventory, …) or refining aggregates/value-objects/domain events.

---

# DDD Tactical Patterns

## Use this skill when

- Translating domain rules into code structures.
- Designing aggregate boundaries and invariants.
- Refactoring an anemic model into behavior-rich domain objects.
- Defining repository contracts and domain event boundaries.

## Do not use this skill when

- You are still defining strategic boundaries.
- The task is only API documentation or UI layout.
- Full DDD complexity is not justified.

## Instructions

1. Identify invariants first and design aggregates around them.
2. Model immutable value objects for validated concepts.
3. Keep domain behavior in domain objects, not controllers.
4. Emit domain events for meaningful state transitions.
5. Keep repositories at aggregate root boundaries.

If detailed checklists are needed, open `references/tactical-checklist.md`.

## Example

```typescript
class Order {
  private status: "draft" | "submitted" = "draft";

  submit(itemsCount: number): void {
    if (itemsCount === 0) throw new Error("Order cannot be submitted empty");
    if (this.status !== "draft") throw new Error("Order already submitted");
    this.status = "submitted";
  }
}
```

## Limitations

- This skill does not define deployment architecture.
- It does not choose databases or transport protocols.
- It should be paired with testing patterns for invariant coverage.
