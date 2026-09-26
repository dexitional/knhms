import { useState } from "react"
import { createFileRoute } from "@tanstack/react-router"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { Search } from "lucide-react"
import { api } from "#/lib/api-client"
import { Input } from "#/components/ui/input.tsx"
import { Card, CardContent } from "#/components/ui/card.tsx"
import { Button } from "#/components/ui/button.tsx"
import { StatusBadge } from "#/components/status-badge"
import { Pagination } from "#/components/pagination"

export const Route = createFileRoute("/admin/_admin/suggestions/")({
  component: AdminSuggestionsPage,
 })

interface SuggestionRow {
  id: number
  subject: string | null
  message: string
  is_anonymous: 0 | 1
  status: string
  created_at: string
  student_name?: string
  registration_number?: string
}

const PAGE_SIZE = 20

function AdminSuggestionsPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ["admin-suggestions", page, search],
    queryFn: () =>
      api.get<{ items: SuggestionRow[]; total: number; page: number; pageSize: number }>(
        "/suggestions",
        { page, pageSize: PAGE_SIZE, search: search || undefined },
      ),
  })

  const reviewMutation = useMutation({
    mutationFn: (id: number) => api.patch(`/suggestions/${id}/review`),
    onSuccess: () => {
      toast.success("Marked as reviewed.")
      queryClient.invalidateQueries({ queryKey: ["admin-suggestions"] })
    },
  })

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-foreground">Suggestions</h1>
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            className="pl-8"
          />
        </div>
      </div>

      {isLoading && <p className="text-muted-foreground">Loading...</p>}

      <div className="flex flex-col gap-3">
        {data?.items.map((s) => (
          <Card key={s.id}>
            <CardContent className="flex items-start justify-between gap-4">
              <div>
                <p className="font-semibold text-foreground">{s.subject ?? "Suggestion"}</p>
                <p className="text-sm text-muted-foreground">{s.message}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {s.student_name ? `${s.student_name} (${s.registration_number})` : "Anonymous"} &middot;{" "}
                  {new Date(s.created_at).toLocaleDateString()}
                </p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <StatusBadge status={s.status} />
                {s.status === "new" && (
                  <Button size="sm" variant="outline" onClick={() => reviewMutation.mutate(s.id)}>
                    Mark Reviewed
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {data && (
        <Pagination
          page={data.page}
          pageSize={data.pageSize}
          total={data.total}
          onPageChange={setPage}
        />
      )}
    </div>
  )
}