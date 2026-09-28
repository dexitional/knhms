import { useRef, useState } from "react";
import { FileText, Loader2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "#/components/ui/button.tsx";
import { api } from "#/lib/api-client";

const MAX_BYTES = 8 * 1024 * 1024; // 8MB

export type UploadFolder = "student-photos" | "receipts" | "admin-photos" | "directory-photos" | "market-images" | "hub-images";

interface PresignResponse {
  uploadUrl: string;
  publicUrl: string;
}

const ACCEPT_BY_FOLDER: Record<UploadFolder, string> = {
  "student-photos": "image/jpeg,image/png,image/webp",
  "admin-photos": "image/jpeg,image/png,image/webp",
  "directory-photos": "image/jpeg,image/png,image/webp",
  "market-images": "image/jpeg,image/png,image/webp",
  "hub-images": "image/jpeg,image/png,image/webp",
  receipts: "image/jpeg,image/png,image/webp,application/pdf",
};

// Presigned direct-to-storage upload; returns the file's public URL.
export async function uploadFile(file: File, folder: UploadFolder): Promise<string> {
  if (file.size > MAX_BYTES) throw new Error("File must be under 8MB.");
  const { uploadUrl, publicUrl } = await api.post<PresignResponse>("/uploads/presign", {
    filename: file.name,
    contentType: file.type,
    folder,
  });
  const putRes = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type },
    body: file,
  });
  if (!putRes.ok) throw new Error("Upload failed");
  return publicUrl;
}

export function FileUploadField({
  label,
  value,
  onChange,
  folder,
  helpText,
}: {
  label: string;
  value?: string;
  onChange: (url: string | undefined) => void;
  folder: UploadFolder;
  helpText?: string;
}) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const isImage = value ? !value.toLowerCase().endsWith(".pdf") : true;

  const handleFile = async (file: File) => {
    if (file.size > MAX_BYTES) {
      toast.error("File must be under 8MB.");
      return;
    }

    setUploading(true);
    try {
      onChange(await uploadFile(file, folder));
    } catch {
      toast.error("Couldn't upload the file — please try again.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium">{label}</span>
      {helpText && <p className="text-xs text-muted-foreground">{helpText}</p>}
      <div className="flex items-center gap-3">
        {value ? (
          <div className="flex items-center gap-2 rounded-md border border-border bg-secondary/40 px-3 py-2 text-sm">
            {isImage ? (
              <img src={value} alt="" className="size-10 rounded object-cover" />
            ) : (
              <FileText className="size-5 text-muted-foreground" />
            )}
            <span className="max-w-[10rem] truncate">Uploaded</span>
            <button
              type="button"
              onClick={() => onChange(undefined)}
              className="text-muted-foreground hover:text-foreground"
              aria-label="Remove file"
            >
              <X className="size-4" />
            </button>
          </div>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
          >
            {uploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
            {uploading ? "Uploading..." : "Choose file"}
          </Button>
        )}
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT_BY_FOLDER[folder]}
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleFile(file);
          }}
        />
      </div>
    </div>
  );
}
