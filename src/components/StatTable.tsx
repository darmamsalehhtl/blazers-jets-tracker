import { useMemo, useState, type ReactNode } from 'react'

export interface Column<R> {
  key: string
  label: string
  title?: string
  render: (row: R) => ReactNode
  /** Numeric value for sorting; omit to make the column unsortable. */
  sort?: (row: R) => number | string
  align?: 'left' | 'right'
}

/**
 * Compact, horizontally scrollable table with a sticky first column.
 * Clicking a sortable header sorts descending, then ascending.
 */
export function StatTable<R>({
  columns,
  rows,
  rowKey,
  footer,
  onRowClick,
  dense = false,
}: {
  columns: Column<R>[]
  rows: R[]
  rowKey: (row: R, i: number) => string
  footer?: ReactNode[]
  onRowClick?: (row: R) => void
  dense?: boolean
}) {
  const [sort, setSort] = useState<{ key: string; dir: 1 | -1 } | null>(null)

  const sorted = useMemo(() => {
    if (!sort) return rows
    const col = columns.find((c) => c.key === sort.key)
    if (!col?.sort) return rows
    return [...rows].sort((a, b) => {
      const va = col.sort!(a)
      const vb = col.sort!(b)
      if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * sort.dir
      return String(va).localeCompare(String(vb)) * sort.dir
    })
  }, [rows, columns, sort])

  const py = dense ? 'py-1.5' : 'py-2'

  return (
    <div className="no-scrollbar overflow-x-auto">
      <table className="stat-table w-full border-collapse text-[13px] tabular-nums">
        <thead>
          <tr className="border-b border-border text-[11px] text-muted uppercase">
            {columns.map((c, i) => (
              <th
                key={c.key}
                title={c.title}
                onClick={() =>
                  c.sort &&
                  setSort((s) => (s?.key === c.key ? (s.dir === -1 ? { key: c.key, dir: 1 } : null) : { key: c.key, dir: -1 }))
                }
                className={`px-2 ${py} font-medium whitespace-nowrap ${i === 0 ? 'pl-4 text-left' : ''} ${
                  (c.align ?? (i === 0 ? 'left' : 'right')) === 'right' ? 'text-right' : 'text-left'
                } ${c.sort ? 'cursor-pointer select-none hover:text-text' : ''} ${i === columns.length - 1 ? 'pr-4' : ''}`}
              >
                {c.label}
                {sort?.key === c.key ? (sort.dir === -1 ? ' ↓' : ' ↑') : ''}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((r, ri) => (
            <tr
              key={rowKey(r, ri)}
              onClick={onRowClick ? () => onRowClick(r) : undefined}
              className={`border-b border-border/60 last:border-0 ${onRowClick ? 'cursor-pointer hover:bg-surface-2' : ''}`}
            >
              {columns.map((c, i) => (
                <td
                  key={c.key}
                  className={`px-2 ${py} whitespace-nowrap ${i === 0 ? 'pl-4' : ''} ${i === columns.length - 1 ? 'pr-4' : ''} ${
                    (c.align ?? (i === 0 ? 'left' : 'right')) === 'right' ? 'text-right' : 'text-left'
                  }`}
                >
                  {c.render(r)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
        {footer && (
          <tfoot>
            <tr className="border-t border-border font-semibold">
              {footer.map((f, i) => (
                <td key={i} className={`px-2 ${py} whitespace-nowrap ${i === 0 ? 'pl-4 text-left' : 'text-right'} ${i === footer.length - 1 ? 'pr-4' : ''}`}>
                  {f}
                </td>
              ))}
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  )
}

/** Build columns straight from ESPN's parallel `labels` / `stats` arrays. */
export function labelColumns<R>(
  labels: string[],
  get: (row: R, i: number) => string | undefined,
  titles?: string[],
): Column<R>[] {
  return labels.map((label, i) => ({
    key: `${i}-${label}`,
    label,
    title: titles?.[i],
    render: (r: R) => get(r, i) ?? '–',
    sort: (r: R) => {
      const v = get(r, i) ?? ''
      const n = parseFloat(v)
      return Number.isFinite(n) ? n : -Infinity
    },
  }))
}
