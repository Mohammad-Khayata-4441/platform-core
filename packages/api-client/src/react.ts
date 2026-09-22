"use client"
export { useApi } from './react/useApi';
export { ApiProvider } from './react/ApiProvider'

// ── CRUD React Query hooks ──
export { crudKeys } from './react/crud-keys'
export { useCrudList, type UseCrudListOptions } from './react/useCrudList'
export { useCrudDetails, type UseCrudDetailsOptions } from './react/useCrudDetails'
export {
    useCrudCreate,
    useCrudUpdate,
    useCrudDelete,
    type CrudUpdateVariables,
} from './react/useCrudMutations'
