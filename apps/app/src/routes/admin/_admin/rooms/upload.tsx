import { useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Upload } from "lucide-react";
import { Button } from "#/components/ui/button.tsx";
import { Card, CardContent, CardHeader, CardTitle } from "#/components/ui/card.tsx";

export const Route = createFileRoute("/admin/_admin/rooms/upload")({
  component: BulkUploadPage,
});

interface SkippedRow {
  row: number;
  roomNumber: string | null;
  reason: string;
}
interface UploadResult {
  inserted: number;
  updated: number;
  skipped: SkippedRow[];
}

function BulkUploadPage() {
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);

  const handleUpload = async (file: File) => {
    setUploading(true);
    setResult(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/rooms/bulk-upload", {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "Upload failed" }));
        throw new Error(body.error ?? "Upload failed");
      }
      const data = (await res.json()) as UploadResult;
      setResult(data);
      toast.success(`Processed: ${data.inserted} added, ${data.updated} updated, ${data.skipped.length} skipped.`);
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <Button asChild variant="ghost" size="sm" className="w-fit">
        <Link to="/admin/rooms">
          <ArrowLeft className="size-4" />
          Back to Rooms
        </Link>
      </Button>

      <h1 className="text-2xl font-bold text-foreground">Bulk Upload Rooms</h1>

      <Card>
        <CardHeader>
          <CardTitle>Upload a .xlsx spreadsheet</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            Expected columns (header row first): <strong>Room Number</strong> (required),{" "}
            <strong>Block</strong>, <strong>Floor</strong>, <strong>Capacity</strong> (1–10, required),{" "}
            <strong>Gender Type</strong> (male / female / mixed, defaults to mixed). Re-uploading a
            spreadsheet updates existing rooms by Room Number.
          </p>
          <Button
            type="button"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
            className="w-fit"
          >
            <Upload className="size-4" />
            {uploading ? "Uploading..." : "Choose .xlsx file"}
          </Button>
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleUpload(file);
            }}
          />
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader>
            <CardTitle>Result</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex gap-4 text-sm">
              <span className="font-semibold text-foreground">{result.inserted} added</span>
              <span className="font-semibold text-foreground">{result.updated} updated</span>
              <span className="font-semibold text-destructive">{result.skipped.length} skipped</span>
            </div>
            {result.skipped.length > 0 && (
              <table className="w-full text-left text-sm">
                <thead className="text-xs text-muted-foreground uppercase">
                  <tr>
                    <th className="py-1 pr-4">Row</th>
                    <th className="py-1 pr-4">Room Number</th>
                    <th className="py-1 pr-4">Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {result.skipped.map((row) => (
                    <tr key={row.row}>
                      <td className="py-1 pr-4">{row.row}</td>
                      <td className="py-1 pr-4">{row.roomNumber ?? "—"}</td>
                      <td className="py-1 pr-4 text-destructive">{row.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
