"use client"

import { useMemo, useState } from "react"
import { Loader2 } from "lucide-react"
import type { AsyncOption, BaseFieldControlProps } from "../types"
import {
  Combobox,
  ComboboxInput,
  ComboboxContent,
  ComboboxList,
  ComboboxItem,
  ComboboxEmpty,
} from "../../shadcn/combobox"

// Default accessors assume the `AsyncOption` ({ value, label }) shape.
// When `TOption` differs, the caller supplies its own accessors.
const asAsyncOption = (opt: unknown) => opt as AsyncOption

type OptionAccessors<TOption, TValue> = {
  getOptionValue?: (option: TOption) => TValue
  getOptionLabel?: (option: TOption) => string
  getOptionKey?: (option: TOption) => string
}

/** Resolve the option accessors, falling back to the `AsyncOption` shape. */
function useAccessors<TOption, TValue>({
  getOptionValue,
  getOptionLabel,
  getOptionKey,
}: OptionAccessors<TOption, TValue>) {
  const getValue = getOptionValue ?? ((o: TOption) => asAsyncOption(o).value as TValue)
  const getLabel = getOptionLabel ?? ((o: TOption) => asAsyncOption(o).label)
  const getKey = getOptionKey ?? ((o: TOption) => String(asAsyncOption(o).value))
  return { getValue, getLabel, getKey }
}

type NormalizedOption<TValue> = { id: string; label: string; value: TValue }

function LoadingRow() {
  return (
    <div className="flex items-center justify-center py-4">
      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
    </div>
  )
}

// ── Single-select ──

export type AsyncSelectFieldProps<TOption = AsyncOption, TValue = string> =
  BaseFieldControlProps<TValue | null> &
    OptionAccessors<TOption, TValue> & {
      options: TOption[]
      loading?: boolean
      onInputValueChange?: (value: string) => void
      placeholder?: string
    }

export function AsyncSelectField<TOption = AsyncOption, TValue = string>({
  value,
  onChange,
  onBlur,
  disabled,
  invalid,
  options,
  loading,
  onInputValueChange,
  placeholder = "Search...",
  getOptionValue,
  getOptionLabel,
  getOptionKey,
}: AsyncSelectFieldProps<TOption, TValue>) {
  const { getValue, getLabel, getKey } = useAccessors({
    getOptionValue,
    getOptionLabel,
    getOptionKey,
  })

  const [open, setOpen] = useState(false)
  // `null` means "show the selected option's label"; a string is the active query.
  const [query, setQuery] = useState<string | null>(null)

  const normalized = useMemo<NormalizedOption<TValue>[]>(
    () => options.map((opt) => ({ id: getKey(opt), label: getLabel(opt), value: getValue(opt) })),
    [options, getKey, getLabel, getValue],
  )

  const idToValue = useMemo(() => {
    const map = new Map<string, TValue>()
    normalized.forEach((o) => map.set(o.id, o.value))
    return map
  }, [normalized])

  // The selected id is derived from the form value so it stays stable while
  // the options list streams in or is filtered.
  const selectedId = useMemo(() => {
    if (value === null || value === undefined) return null
    // Generic bridge: TValue and TOption are independent, unconstrained generics; the stored form
    // value is sometimes the full option object, so it must be re-typed as TOption to call getKey().
    // Callers guarantee this shape via getOptionKey/getOptionValue.
    // eslint-disable-next-line no-restricted-syntax -- see comment above: generic bridge between TValue and TOption
    if (typeof value === "object") return getKey(value as unknown as TOption)
    return String(value)
  }, [value, getKey])

  // Label for the current selection, derived (no effect needed). Falls back to
  // the stored object value so the name shows before the matching option loads.
  const selectedLabel = useMemo(() => {
    if (selectedId === null) return ""
    const match = normalized.find((o) => o.id === selectedId)
    if (match) return match.label
    if (value !== null && value !== undefined && typeof value === "object") {
      // Same generic bridge as selectedId above: the stored form value is sometimes the
      // full option object, re-typed as TOption for getLabel().
      // eslint-disable-next-line no-restricted-syntax -- see comment above: generic bridge between TValue and TOption
      return getLabel(value as unknown as TOption)
    }
    return ""
  }, [selectedId, normalized, value, getLabel])

  const inputValue = query ?? selectedLabel

  const handleValueChange = (id: string | null) => {
    setQuery(null)
    if (id === null) {
      onChange(null)
      return
    }
    const stored = idToValue.get(id)
    if (stored !== undefined) onChange(stored)
  }

  const handleInputValueChange = (val: string, details: { reason: string }) => {
    if (details.reason === "input-change") {
      setQuery(val)
      onInputValueChange?.(val)
    }
  }

  return (
    <Combobox
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        // Open with an empty query (full list visible); on close revert the
        // input to the selected label (query = null) and reset the search.
        setQuery(next ? "" : null)
        onInputValueChange?.("")
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
        <ComboboxList>
          {loading && <LoadingRow />}
          {!loading &&
            normalized.map((o) => (
              <ComboboxItem key={o.id} value={o.id}>
                {o.label}
              </ComboboxItem>
            ))}
          {!loading && normalized.length === 0 && (
            <ComboboxEmpty>No results found</ComboboxEmpty>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  )
}

// ── Multi-select ──

export type AsyncMultiSelectFieldProps<TOption = AsyncOption, TValue = string> =
  BaseFieldControlProps<TValue[]> &
    OptionAccessors<TOption, TValue> & {
      options: TOption[]
      loading?: boolean
      onInputValueChange?: (value: string) => void
      placeholder?: string
    }

export function AsyncMultiSelectField<TOption = AsyncOption, TValue = string>({
  value,
  onChange,
  onBlur,
  disabled,
  invalid,
  options,
  loading,
  onInputValueChange,
  placeholder = "Search...",
  getOptionValue,
  getOptionLabel,
  getOptionKey,
}: AsyncMultiSelectFieldProps<TOption, TValue>) {
  const { getValue, getLabel, getKey } = useAccessors({
    getOptionValue,
    getOptionLabel,
    getOptionKey,
  })

  const [open, setOpen] = useState(false)

  const normalized = useMemo<NormalizedOption<TValue>[]>(
    () => options.map((opt) => ({ id: getKey(opt), label: getLabel(opt), value: getValue(opt) })),
    [options, getKey, getLabel, getValue],
  )

  // Map id → stored value for the currently loaded options.
  const idToValue = useMemo(() => {
    const map = new Map<string, TValue>()
    normalized.forEach((o) => map.set(o.id, o.value))
    return map
  }, [normalized])

  // Stable map of already-selected values so they survive search/option changes
  // (lets the user deselect an item that is no longer in the filtered list).
  const valueBySelectedId = useMemo(() => {
    const map = new Map<string, TValue>()
    ;(value ?? []).forEach((v) => {
      // Same generic bridge as the single-select above: stored form values are
      // sometimes full option objects, re-typed as TOption for getKey().
      const id =
        // eslint-disable-next-line no-restricted-syntax -- see comment above: generic bridge between TValue and TOption
        v !== null && typeof v === "object" ? getKey(v as unknown as TOption) : String(v)
      map.set(id, v)
    })
    return map
  }, [value, getKey])

  const selectedIds = useMemo(
    () =>
      (value ?? [])
        .map((v) =>
          // eslint-disable-next-line no-restricted-syntax -- same generic bridge as valueBySelectedId above
          v !== null && typeof v === "object" ? getKey(v as unknown as TOption) : String(v),
        )
        .filter((id): id is string => id !== ""),
    [value, getKey],
  )

  const handleValueChange = (ids: string[]) => {
    const next = ids
      .map((id) => idToValue.get(id) ?? valueBySelectedId.get(id))
      .filter((v): v is TValue => v !== undefined)
    onChange(next)
  }

  const handleInputValueChange = (val: string, details: { reason: string }) => {
    if (details.reason === "input-change") onInputValueChange?.(val)
  }

  return (
    <Combobox
      multiple
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) onInputValueChange?.("")
      }}
      value={selectedIds}
      onValueChange={(val) => handleValueChange(val as string[])}
      disabled={disabled}
      onInputValueChange={handleInputValueChange}
      filter={() => true}
    >
      <ComboboxInput
        placeholder={placeholder}
        showClear={selectedIds.length > 0}
        onBlur={onBlur}
        aria-invalid={invalid || undefined}
      />
      <ComboboxContent>
        <ComboboxList>
          {loading && <LoadingRow />}
          {!loading &&
            normalized.map((o) => (
              <ComboboxItem key={o.id} value={o.id}>
                {o.label}
              </ComboboxItem>
            ))}
          {!loading && normalized.length === 0 && (
            <ComboboxEmpty>No results found</ComboboxEmpty>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  )
}
