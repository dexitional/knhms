import { useRef, useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { AlertTriangle, CheckCircle2, Download, FileSpreadsheet, Loader2, RotateCcw, Upload } from "lucide-react"
import { api, ApiError } from "#/lib/api-client"
import { cn } from "#/lib/utils"
import { IMPORT_COLUMNS, IMPORT_MAX_ROWS } from "#/lib/inventory"
import type { ImportMode, ImportResult, ImportRow, InventoryItem } from "#/lib/inventory"
import { Badge } from "#/components/ui/badge.tsx"
import { Button } from "#/components/ui/button.tsx"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "#/components/ui/dialog.tsx"
import { INVENTORY_KEY } from "./stock-tab"

// Bulk stock upload. The spreadsheet is read here in the browser and only
// plain rows are sent; the server validates every row and previews the
// changes (dryRun) before anything is saved.

const MAX_FILE_BYTES = 5 * 1024 * 1024
const HEADINGS = ["Item name", "Description", "Category", "Quantity", "Minimum quantity"]

const loadXlsx = () => import("xlsx")

async function downloadWorkbook(filename: string, rows: Array<Array<string | number>>, withNotes: boolean) {
  const XLSX = await loadXlsx()
  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.aoa_to_sheet([HEADINGS, ...rows])
  ws["!cols"] = [{ wch: 30 }, { wch: 40 }, { wch: 20 }, { wch: 10 }, { wch: 18 }]
  XLSX.utils.book_append_sheet(wb, ws, "Stock")
  if (withNotes) {
    const notes = XLSX.utils.aoa_to_sheet([
      ["How to fill in the Stock sheet"],
      ["Item name: required. Rows match existing items by name (upper/lower case doesn't matter)."],
      ["Description, Category: optional. A new category name is created automatically."],
      ["Quantity: new items start with this stock. For existing items, the upload adds it (restock) or sets it (stock-take)."],
      ["Minimum quantity: low-stock alerts go out when stock drops to this level."],
      ["Leave a cell blank to keep an existing item's current value."],
      [`Up to ${IMPORT_MAX_ROWS} rows per upload. Keep the headings in the first row.`],
    ])
    notes["!cols"] = [{ wch: 110 }]
    XLSX.utils.book_append_sheet(wb, notes, "Instructions")
  }
  XLSX.writeFile(wb, filename)
}

// Reads the first sheet, matching headings flexibly (see IMPORT_COLUMNS).
async function readRows(file: File): Promise<Array<ImportRow>> {
  const XLSX = await loadXlsx()
  const wb = XLSX.read(await file.arrayBuffer(), { type: "array", cellFormula: false, cellHTML: false })
  const sheetName = wb.SheetNames[0]
  const ws = sheetName ? wb.Sheets[sheetName] : undefined
  if (!ws) throw new Error("The file has no sheets.")
  const records = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "", raw: true })
  if (records.length === 0) throw new Error("The first sheet has no rows under the headings.")

  const headings = Object.keys(records[0] ?? {})
  const columnFor = (field: keyof typeof IMPORT_COLUMNS) =>
    headings.find((h) => IMPORT_COLUMNS[field].includes(h.trim().toLowerCase()))
  const nameColumn = columnFor("name")
  if (!nameColumn) throw new Error('Couldn\'t find an "Item name" column. Use the template headings in the first row.')
  const cols = {
    description: columnFor("description"),
    category: columnFor("category"),
    quantity: columnFor("quantity"),
    minQuantity: columnFor("minQuantity"),
  }
  const cell = (record: Record<string, unknown>, column?: string) => {
    if (!column) return undefined
    const v = record[column]
    return typeof v === "number" ? v : typeof v === "string" ? v : v == null ? undefined : String(v)
  }

  const rows: Array<ImportRow> = []
  records.forEach((record, i) => {
    const values = Object.values(record).map((v) => String(v).trim())
    if (values.every((v) => v === "")) return // skip blank lines
    rows.push({
      row: i + 2, // heading is row 1
      name: String(record[nameColumn] ?? ""),
      description: cell(record, cols.description) as string | undefined,
      category: cell(record, cols.category) as string | undefined,
      quantity: cell(record, cols.quantity),
      minQuantity: cell(record, cols.minQuantity),
    })
  })
  if (rows.length === 0) throw new Error("The first sheet has no rows under the headings.")
  if (rows.length > IMPORT_MAX_ROWS) throw new Error(`Upload at most ${IMPORT_MAX_ROWS} rows at a time.`)
  return rows
}

const ACTION_BADGE = { create: "success", update: "info", unchanged: "secondary", error: "danger" } as const
const ACTION_LABEL = { create: "New", update: "Update", unchanged: "No change", error: "Error" } as const

export function ImportDialog({ items, onClose }: { items: Array<InventoryItem>; onClose: () => void }) {
  const queryClient = useQueryClient()
  const fileRef = useRef<HTMLInputElement>(null)
  const [mode, setMode] = useState<ImportMode>("restock")
  const [file, setFile] = useState<{ name: string; rows: Array<ImportRow> } | null>(null)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [reading, setReading] = useState(false)

  const preview = useMutation({
    mutationFn: ({ rows, m }: { rows: Array<ImportRow>; m: ImportMode }) =>
      api.post<ImportResult>("/inventory/items/import", { mode: m, dryRun: true, rows }),
    onSuccess: setResult,
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Couldn't check the file."),
  })
  const apply = useMutation({
    mutationFn: () => api.post<ImportResult>("/inventory/items/import", { mode, dryRun: false, rows: file!.rows }),
    onSuccess: (r) => {
      if (!r.applied) {
        setResult(r)
        toast.error("Some rows need fixing; nothing was saved.")
        return
      }
      toast.success(`Stock updated: ${r.summary.create} new, ${r.summary.update} updated.`)
      queryClient.invalidateQueries({ queryKey: INVENTORY_KEY })
      onClose()
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Couldn't apply the upload."),
  })

  const handleFile = async (f: File) => {
    if (f.size > MAX_FILE_BYTES) {
      toast.error("The file must be under 5MB.")
      return
    }
    setReading(true)
    setResult(null)
    try {
      const rows = await readRows(f)
      setFile({ name: f.name, rows })
      preview.mutate({ rows, m: mode })
    } catch (err) {
      setFile(null)
      toast.error(err instanceof Error ? err.message : "Couldn't read that file.")
    } finally {
      setReading(false)
      if (fileRef.current) fileRef.current.value = ""
    }
  }

  const changeMode = (m: ImportMode) => {
    setMode(m)
    if (file) preview.mutate({ rows: file.rows, m })
  }

  const busy = reading || preview.isPending || apply.isPending
  const changes = result ? result.summary.create + result.summary.update : 0
  const canApply = !!result && result.summary.error === 0 && changes > 0 && !busy

  return (
    <Dialog open onOpenChange={(open) => !open && !apply.isPending && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Bulk stock upload</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-muted-foreground">Start from:</span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                void downloadWorkbook(
                  "knh-stock-template.xlsx",
                  [
                    ["LED bulbs (18W)", "Replacement bulbs for rooms", "Electrical", 50, 20],
                    ["Brooms", "", "Cleaning", 10, 5],
                  ],
                  true,
                )
              }
            >
              <Download className="size-4" /> Blank template
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={items.length === 0}
              onClick={() =>
                void downloadWorkbook(
                  "knh-current-stock.xlsx",
                  items.map((i) => [i.name, i.description ?? "", i.category_name ?? "", i.quantity, i.min_quantity]),
                  true,
                )
              }
            >
              <Download className="size-4" /> Current stock (for a stock-take)
            </Button>
          </div>

          <fieldset>
            <legend className="mb-2 text-sm font-medium">For items that already exist, the Quantity column should…</legend>
            <div className="grid gap-2 sm:grid-cols-2" role="radiogroup">
              {(
                [
                  ["restock", "Add to stock", "Receiving a delivery: quantities are added and logged as restocks."],
                  ["set", "Set the count (stock-take)", "Quantities replace current stock; differences are logged as adjustments."],
                ] as const
              ).map(([value, label, hint]) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={mode === value}
                  disabled={busy}
                  onClick={() => changeMode(value)}
                  className={cn(
                    "rounded-lg border p-3 text-left transition-colors disabled:opacity-60",
                    mode === value ? "border-primary bg-primary/5" : "border-border hover:border-primary/50",
                  )}
                >
                  <span className="block text-sm font-semibold">{label}</span>
                  <span className="text-xs text-muted-foreground">{hint}</span>
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">New items always start with their Quantity as opening stock.</p>
          </fieldset>

          <div>
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) void handleFile(f)
              }}
            />
            <button
              type="button"
              disabled={busy}
              onClick={() => fileRef.current?.click()}
              className="flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed border-border px-4 py-6 text-center transition-colors hover:border-primary hover:bg-primary/5 disabled:opacity-60"
            >
              {reading || preview.isPending ? (
                <Loader2 className="size-7 animate-spin text-primary" />
              ) : (
                <FileSpreadsheet className="size-7 text-emerald-600" />
              )}
              <span className="text-sm font-medium">
                {file ? `${file.name} · ${file.rows.length} rows` : "Choose an Excel or CSV file"}
              </span>
              <span className="text-xs text-muted-foreground">
                {file ? "Choose another file to replace it" : `Up to ${IMPORT_MAX_ROWS} rows, 5MB`}
              </span>
            </button>
          </div>

          {result && (
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap gap-2 text-sm">
                <Badge variant="success">{result.summary.create} new</Badge>
                <Badge variant="info">{result.summary.update} updated</Badge>
                <Badge variant="secondary">{result.summary.unchanged} unchanged</Badge>
                {result.summary.error > 0 && <Badge variant="danger">{result.summary.error} with errors</Badge>}
                {result.newCategories.length > 0 && (
                  <span className="text-xs text-muted-foreground">
                    New categories: {result.newCategories.join(", ")}
                  </span>
                )}
              </div>
              {result.summary.error > 0 ? (
                <p className="flex items-start gap-2 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                  Fix the rows marked Error in your file and upload it again. Nothing is saved until every row is valid.
                </p>
              ) : changes === 0 ? (
                <p className="flex items-start gap-2 rounded-lg bg-secondary px-3 py-2 text-sm">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                  Everything in the file already matches the current stock.
                </p>
              ) : null}
              <div className="max-h-72 overflow-y-auto rounded-lg border border-border">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-secondary text-left text-xs text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 font-medium">Row</th>
                      <th className="px-3 py-2 font-medium">Item</th>
                      <th className="px-3 py-2 font-medium">Result</th>
                      <th className="px-3 py-2 font-medium">Changes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {result.rows.map((r) => (
                      <tr key={r.row} className={cn(r.action === "error" && "bg-rose-50/60")}>
                        <td className="px-3 py-2 text-muted-foreground">{r.row}</td>
                        <td className="px-3 py-2 font-medium">{r.name || "—"}</td>
                        <td className="px-3 py-2">
                          <Badge variant={ACTION_BADGE[r.action]}>{ACTION_LABEL[r.action]}</Badge>
                        </td>
                        <td className="px-3 py-2 text-xs">
                          {r.error ? (
                            <span className="text-rose-700">{r.error}</span>
                          ) : (
                            r.changes.join(" · ") || <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          {file && (
            <Button
              type="button"
              variant="ghost"
              disabled={busy}
              onClick={() => {
                setFile(null)
                setResult(null)
              }}
            >
              <RotateCcw className="size-4" /> Start over
            </Button>
          )}
          <Button type="button" disabled={!canApply} onClick={() => apply.mutate()}>
            {apply.isPending ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
            {apply.isPending ? "Applying..." : changes > 0 ? `Apply ${changes} change${changes === 1 ? "" : "s"}` : "Apply"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
