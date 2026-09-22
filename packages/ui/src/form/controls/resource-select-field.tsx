"use client"

import { useState, useCallback, useMemo, useRef } from "react"
import { useInfiniteQuery, type InfiniteData } from "@tanstack/react-query"
import type { ICrudClient } from "@core/api-client"
import { useApi } from "@core/api-client/react"
import type { ResourceItem } from "../../data-view/resource"
import {
  Combobox,
  ComboboxInput,
  ComboboxContent,
  ComboboxList,
  ComboboxItem,
  ComboboxEmpty,
  ComboboxChips,
  ComboboxChip,
  ComboboxChipsInput,
  useComboboxAnchor,
} from "../../shadcn/combobox"
import {   Loader2, PlusIcon } from "lucide-react"

type ApiInstance = ReturnType<typeof useApi>

// ── Shared base props ──

type BaseResourceSelectFieldProps<
  TClient extends ICrudClient = ICrudClient,
  TValue = string,
> = {
  /** CrudClient instance or factory function */
  client: TClient | ((api: ApiInstance) => TClient)
  /** Extract display label from an API item */
  getLabel: (item: ResourceItem<TClient>) => string
  /**
   * Extract the value to store in the form field.
   * Defaults to `(item) => item.id`.
   * Pass `(item) => item` to store the full object.
   */
  getValue?: (item: ResourceItem<TClient>) => TValue
  /** Extract a unique primitive key for combobox selection tracking (defaults to `String(item.id)`) */
  getId?: (item: ResourceItem<TClient>) => string
  /** Custom TanStack Query key prefix (defaults to `[client.key, "select"]`) */
  queryKey?: string[]
  /** Cache duration in ms (defaults to 5 minutes) */
  staleTime?: number
  /** Query parameter name for text search (defaults to `"search"`) */
  searchParam?: string
  /**
   * Fields the server searches within, sent as `searchIn` (comma-separated).
   * The API only filters when both `search` and `searchIn` are present, so this
   * must list the searchable columns. Defaults to `["name"]`.
   */
  searchIn?: string[]
  /** Items per page (defaults to 20) */
  pageSize?: number
  /** If `true` (default), fetching is deferred until the dropdown opens */
  lazy?: boolean
  /** Placeholder text */
  placeholder?: string
  /** Disabled state */
  disabled?: boolean
  /** Invalid state (shows error styling) */
  invalid?: boolean
  /** Extra params merged into every list() call (e.g. fixed filters) */
  extraQuery?: Record<string, unknown>
  /** Callback when the user clicks "Add new..." at the bottom of the dropdown */
  onCreateClick?: () => void
  /** Label for the "Add new..." item (defaults to "Add new") */
  createLabel?: string
}

// ── Single Select ──

export type ResourceSelectFieldProps<
  TClient extends ICrudClient = ICrudClient,
  TValue = string,
> = BaseResourceSelectFieldProps<TClient, TValue> & {
  value?: TValue | null
  onChange?: (value: TValue | null) => void
  onBlur?: () => void
}

export function ResourceSelectField<
  TClient extends ICrudClient = ICrudClient,
  TValue = string,
>({
  value,
  onChange,
  onBlur,
  disabled,
  invalid,
  placeholder = "Search...",
  client,
  getLabel,
  // Default getValue for the generic TValue: the resolved item's id is always a string, but
  // TValue is unconstrained, so the default must bridge through `unknown`. Callers that need
  // a non-string TValue supply their own getValue.
  // eslint-disable-next-line no-restricted-syntax -- see comment above: generic bridge for unconstrained TValue
  getValue = (item: any) => String(item.id) as unknown as TValue,
  getId = (item: any) => String(item.id),
  queryKey,
  staleTime = 5 * 60 * 1000,
  searchParam = "search",
  searchIn = ["name"],
  pageSize = 20,
  lazy = true,
  extraQuery,
  onCreateClick,
  createLabel = "Add new",
}: ResourceSelectFieldProps<TClient, TValue>) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState("")

  const api = useApi()
  const resolvedClient = typeof client === "function" ? client(api) : client
  const resolvedQueryKey = queryKey ?? [resolvedClient.key]

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteQuery<unknown, Error, InfiniteData<unknown>, string[], number>({
    queryKey: [...resolvedQueryKey, JSON.stringify(extraQuery), search],
    queryFn: async ({ pageParam = 1 }) => {
      const response = await resolvedClient.list({
        page: pageParam,
        limit: pageSize,
        ...(search ? { [searchParam]: search, searchIn: searchIn.join(",") } : {}),
        ...extraQuery,
      } as any)
      return response
    },
    getNextPageParam: (lastPage: any, allPages: any[]) => {
      const meta = lastPage?.meta as { last_page?: number; total?: number; per_page?: number } | undefined
      const currentPage = allPages.length
      if (meta?.last_page) {
        if (currentPage >= meta.last_page) return undefined
      } else if (meta?.total !== undefined && meta?.per_page) {
        const lastPage = Math.ceil(meta.total / meta.per_page)
        if (currentPage >= lastPage) return undefined
      } else {
        const items = Array.from(lastPage?.data ?? [])
        if (items.length < pageSize) return undefined
      }
      return currentPage + 1
    },
    initialPageParam: 1,
    enabled: !lazy || isOpen,
    staleTime,
  })

  const items = data?.pages.flatMap((page: any) => Array.from(page?.data ?? [])) ?? []

  const options = items.map((item: any) => ({
    id: getId(item as ResourceItem<TClient>),
    label: getLabel(item as ResourceItem<TClient>),
    value: getValue(item as ResourceItem<TClient>),
    raw: item,
  }))

  // Build a lookup map from combobox id -> stored value for fast selection resolution
  const idToValueMap = new Map<string, TValue>()
  const idToItemMap = new Map<string, ResourceItem<TClient>>()
  options.forEach((opt) => {
    idToValueMap.set(opt.id, opt.value)
    idToItemMap.set(opt.id, opt.raw as ResourceItem<TClient>)
  })

  // Selected combobox id derived directly from the form value so it stays stable across option changes
  const selectedId = useMemo(() => {
    if (value === null || value === undefined) return null
    if (typeof value === "object" && value !== null) {
      return getId(value as any)
    }
    return String(value)
  }, [value, getId])

  // `null` means "show the selected option's label"; a string is the active query.
  const [query, setQuery] = useState<string | null>(null)

  // Label for the current selection, derived (no effect needed — an effect that
  // calls setState on every render is what previously wiped the search text).
  // Falls back to deriving the label from the stored value itself (e.g. when it's
  // the full object) so the name shows before matching options have loaded.
  const selectedLabel = useMemo(() => {
    if (selectedId === null) return ""
    const option = options.find((opt) => opt.id === selectedId)
    if (option) return option.label
    if (value !== null && value !== undefined && typeof value === "object") {
      return getLabel(value as ResourceItem<TClient>)
    }
    return ""
  }, [selectedId, options, value, getLabel])

  const inputValue = query ?? selectedLabel

  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const target = e.currentTarget
      if (target.scrollTop + target.clientHeight >= target.scrollHeight - 50) {
        if (hasNextPage && !isFetchingNextPage) {
          fetchNextPage()
        }
      }
    },
    [hasNextPage, isFetchingNextPage, fetchNextPage],
  )

  const handleValueChange = (id: string | null) => {
    setQuery(null)
    if (id === null) {
      onChange?.(null)
      return
    }
    const storedValue = idToValueMap.get(id)
    if (storedValue !== undefined) onChange?.(storedValue)
  }

  const handleInputValueChange = (val: string, eventDetails: { reason: string }) => {
    if (eventDetails.reason === "input-change") {
      setQuery(val)
      setSearch(val)
    }
  }

  return (
    <Combobox
      open={isOpen}
      onOpenChange={(open) => {
        setIsOpen(open)
        // Open with an empty query (full list visible); on close revert the
        // input to the selected label (query = null). Reset the search either way.
        setQuery(open ? "" : null)
        setSearch("")
      }}
      value={selectedId}
      onValueChange={(val) => handleValueChange(val as string | null)}
      disabled={disabled}
      onInputValueChange={handleInputValueChange}
      filter={() => true}
    >
      <ComboboxInput
        placeholder={placeholder}
        showClear={selectedId !== null}
        onBlur={onBlur}
        aria-invalid={invalid || undefined}
        value={inputValue}
      />
      <ComboboxContent>
        <ComboboxList onScroll={handleScroll as any}>
          {isLoading && (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          )}
          {!isLoading &&
            options.map((opt) => (
              <ComboboxItem key={opt.id} value={opt.id}>
                {opt.label}
              </ComboboxItem>
            ))}
          {!isLoading && options.length === 0 && !onCreateClick && (
            <ComboboxEmpty>No results found</ComboboxEmpty>
          )}
          {onCreateClick && !isLoading && (
            <>
              {options.length > 0 && <div className="mx-2 my-1 border-t" />}
              <div
                role="option"
                aria-selected={false}
                className="relative flex w-full cursor-pointer items-center gap-2 rounded-sm py-1.5 pe-8 ps-2 text-sm outline-none select-none transition-colors hover:bg-accent hover:text-accent-foreground text-muted-foreground"
                onClick={() => {
                  setIsOpen(false)
                  setQuery(null)
                  setSearch("")
                  onCreateClick()
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault()
                    setIsOpen(false)
                    setQuery(null)
                    setSearch("")
                    onCreateClick()
                  }
                }}
              >
                <PlusIcon className="h-4 w-4" />
                {createLabel}
              </div>
            </>
          )}
          {isFetchingNextPage && (
            <div className="flex items-center justify-center py-2">
              <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
            </div>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  )
}

// ── Multi Select ──

export type ResourceMultiSelectFieldProps<
  TClient extends ICrudClient = ICrudClient,
  TValue = string,
> = BaseResourceSelectFieldProps<TClient, TValue> & {
  value?: TValue[]
  onChange?: (value: TValue[]) => void
  onBlur?: () => void
}

export function ResourceMultiSelectField<
  TClient extends ICrudClient = ICrudClient,
  TValue = string,
>({
  value,
  onChange,
  onBlur,
  disabled,
  invalid,
  placeholder = "Search...",
  client,
  getLabel,
  // Same generic bridge as ResourceSelectField above: TValue is unconstrained,
  // the default assumes a string id.
  // eslint-disable-next-line no-restricted-syntax -- see comment above: generic bridge for unconstrained TValue
  getValue = (item: any) => String(item.id) as unknown as TValue,
  getId = (item: any) => String(item.id),
  queryKey,
  staleTime = 5 * 60 * 1000,
  searchParam = "search",
  searchIn = ["name"],
  pageSize = 20,
  lazy = true,
  extraQuery,
}: ResourceMultiSelectFieldProps<TClient, TValue>) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState("")
  const anchorRef = useComboboxAnchor()

  const api = useApi()
  const resolvedClient = typeof client === "function" ? client(api) : client
  const resolvedQueryKey = queryKey ?? [resolvedClient.key, "multi-select"]

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteQuery<unknown, Error, InfiniteData<unknown>, string[], number>({
    queryKey: [...resolvedQueryKey, JSON.stringify(extraQuery), search],
    queryFn: async ({ pageParam = 1 }) => {
      const response = await resolvedClient.list({
        page: pageParam,
        limit: pageSize,
        ...(search ? { [searchParam]: search, searchIn: searchIn.join(",") } : {}),
        ...extraQuery,
      } as any)
      return response
    },
    getNextPageParam: (lastPage: any, allPages: any[]) => {
      const meta = lastPage?.meta as { last_page?: number; total?: number; per_page?: number } | undefined
      const currentPage = allPages.length
      if (meta?.last_page) {
        if (currentPage >= meta.last_page) return undefined
      } else if (meta?.total !== undefined && meta?.per_page) {
        const lastPage = Math.ceil(meta.total / meta.per_page)
        if (currentPage >= lastPage) return undefined
      } else {
        const items = Array.from(lastPage?.data ?? [])
        if (items.length < pageSize) return undefined
      }
      return currentPage + 1
    },
    initialPageParam: 1,
    enabled: !lazy || isOpen,
    staleTime,
  })

  // Stable reference per fetch — prevents useEffect/useMemo churn on every render
  const items = useMemo(
    () => data?.pages.flatMap((page: any) => Array.from(page?.data ?? [])) ?? [],
    [data],
  )

  const options = items.map((item: any) => ({
    id: getId(item as ResourceItem<TClient>),
    label: getLabel(item as ResourceItem<TClient>),
    value: getValue(item as ResourceItem<TClient>),
    raw: item,
  }))

  // Map from ID → stored value for currently loaded options
  const idToValueMap = new Map<string, TValue>()
  options.forEach((opt) => idToValueMap.set(opt.id, opt.value))

  // Stable map from ID → stored value for already-selected items so they survive search changes
  const valueBySelectedId = useMemo(() => {
    const map = new Map<string, TValue>()
    ;(value ?? []).forEach((v) => {
      const id = typeof v === "object" && v !== null ? getId(v as any) : String(v)
      map.set(id, v)
    })
    return map
  }, [value, getId])

  // Accumulate labels in a ref — no setState means no re-render loop
  const labelRef = useRef<Map<string, string>>(new Map())
  options.forEach((opt) => labelRef.current.set(opt.id, opt.label))

  const selectedIds = useMemo(() => {
    return (value ?? [])
      .map((v) => {
        if (typeof v === "object" && v !== null) return getId(v as any)
        return String(v)
      })
      .filter((id): id is string => id !== undefined && id !== "")
  }, [value, getId])

  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const target = e.currentTarget
      if (target.scrollTop + target.clientHeight >= target.scrollHeight - 50) {
        if (hasNextPage && !isFetchingNextPage) {
          fetchNextPage()
        }
      }
    },
    [hasNextPage, isFetchingNextPage, fetchNextPage],
  )

  const handleValueChange = (ids: string[]) => {
    const storedValues = ids
      .map((id) => idToValueMap.get(id) ?? valueBySelectedId.get(id))
      .filter((v): v is TValue => v !== undefined)
    onChange?.(storedValues)
  }

  const handleInputValueChange = (val: string, eventDetails: { reason: string }) => {
    if (eventDetails.reason === "input-change") {
      setSearch(val)
    }
  }

  return (
    <Combobox
      multiple
      open={isOpen}
      onOpenChange={(open) => {
        setIsOpen(open)
        if (!open) setSearch("")
      }}
      value={selectedIds}
      onValueChange={(val) => handleValueChange(val as string[])}
      disabled={disabled}
      onInputValueChange={handleInputValueChange}
      filter={() => true}
    >
      <ComboboxChips ref={anchorRef} aria-invalid={invalid || undefined}>
        {selectedIds.map((id) => (
          <ComboboxChip key={id}>
            {labelRef.current.get(id) ?? id}
          </ComboboxChip>
        ))}
        <ComboboxChipsInput
          placeholder={selectedIds.length === 0 ? placeholder : ""}
          onBlur={onBlur}
        />
      </ComboboxChips>
      <ComboboxContent anchor={anchorRef}>
        <ComboboxList onScroll={handleScroll as any}>
          {isLoading && (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          )}
          {!isLoading &&
            options.map((opt) => (
              <ComboboxItem key={opt.id} value={opt.id}>
                {opt.label}
              </ComboboxItem>
            ))}
          {!isLoading && options.length === 0 && (
            <ComboboxEmpty>No results found</ComboboxEmpty>
          )}
          {isFetchingNextPage && (
            <div className="flex items-center justify-center py-2">
              <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
            </div>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  )
}