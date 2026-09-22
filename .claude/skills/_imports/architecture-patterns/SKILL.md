---
name: "architecture-patterns"
description: "Master proven backend architecture patterns including Clean Architecture, Hexagonal Architecture, and Domain-Driven Design to build maintainable, testable, and scalable systems. | ERP trigger: Load when evaluating Clean/Hexagonal/DDD tradeoffs for a new module or refactoring an existing one."
source: "sickn33/antigravity-awesome-skills"
upstream_sha: "0b287bd181bb985ea7ff43e98d83b1f8e9f29639"
upstream_path: "skills/architecture-patterns/SKILL.md"
license: "MIT"
imported_with: "scripts/wrap-imported-skills.mjs"
---

# architecture-patterns — ERP Wrapper

> Imported from `sickn33/antigravity-awesome-skills` @ `0b287bd` (MIT).
> Upstream body preserved verbatim in `UPSTREAM.md`.
> Do not edit body content here — refresh via the script instead.

## When to use in this ERP

Load when evaluating Clean/Hexagonal/DDD tradeoffs for a new module or refactoring an existing one.

---

# Architecture Patterns

Master proven backend architecture patterns including Clean Architecture, Hexagonal Architecture, and Domain-Driven Design to build maintainable, testable, and scalable systems.

## Use this skill when

- Designing new backend systems from scratch
- Refactoring monolithic applications for better maintainability
- Establishing architecture standards for your team
- Migrating from tightly coupled to loosely coupled architectures
- Implementing domain-driven design principles
- Creating testable and mockable codebases
- Planning microservices decomposition

## Do not use this skill when

- You only need small, localized refactors
- The system is primarily frontend with no backend architecture changes
- You need implementation details without architectural design

## Instructions

1. Clarify domain boundaries, constraints, and scalability targets.
2. Select an architecture pattern that fits the domain complexity.
3. Define module boundaries, interfaces, and dependency rules.
4. Provide migration steps and validation checks.
5. For workflows that must survive failures (payments, order fulfillment, multi-step processes), use durable execution at the infrastructure layer — frameworks like DBOS persist workflow state, providing crash recovery without adding architectural complexity.

Refer to `resources/implementation-playbook.md` for detailed patterns, checklists, and templates.

## Related Skills

Works well with: `event-sourcing-architect`, `saga-orchestration`, `workflow-automation`, `dbos-*`

## Resources

- `resources/implementation-playbook.md` for detailed patterns, checklists, and templates.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
