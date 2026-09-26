import { Dialog, DialogContent } from "#/components/ui/dialog.tsx"
import { X } from "lucide-react"
import { cn } from "#/lib/utils.ts"

interface ImageViewerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  src: string
  alt: string
}

export function ImageViewer({ open, onOpenChange, src, alt }: ImageViewerProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "fixed top-[50%] left-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-0 shadow-2xl duration-300 outline-none",
          "data-[state=open]:animate-in data-[state=closed]:animate-out",
          "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
          "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
          "max-h-[90vh] max-w-[90vw] rounded-2xl overflow-hidden",
        )}
        showCloseButton={false}
      >
        <div className="relative aspect-[4/3] max-h-[80vh] overflow-hidden">
          <img
            src={src}
            alt={alt}
            className="w-full h-full object-contain transition-all duration-300 ease-out"
          />
          <button
            onClick={() => onOpenChange(false)}
            className="absolute top-4 right-4 z-10 rounded-full bg-black/60 backdrop-blur-sm text-white p-2 shadow-xl hover:bg-black/80 hover:scale-110 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-black"
            aria-label="Close"
          >
            <X className="size-5" />
          </button>
        </div>
        <div className="px-6 py-4 text-center text-sm text-muted-foreground font-medium">
          {alt}
        </div>
      </DialogContent>
    </Dialog>
  )
}