"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Download, FileText, FileSpreadsheet, Image as ImageIcon, File, ExternalLink, Calendar, Tag, HardDrive } from "lucide-react"
import { formatFileSize, formatDateTime } from "@/lib/utils"

export interface DocumentItem {
  id: string
  fileName: string
  originalFileName: string
  storageKey: string
  mimeType: string
  fileSize: number
  category?: string | null
  returnPeriod?: string | null
  financialYear?: string | null
  uploadedBy?: string | null
  createdAt: string | Date
  downloadUrl?: string
}

interface DocumentPreviewModalProps {
  document: DocumentItem | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DocumentPreviewModal({
  document,
  open,
  onOpenChange,
}: DocumentPreviewModalProps) {
  const [zoom, setZoom] = useState(100)

  if (!document) return null

  const isPdf = document.mimeType === "application/pdf" || document.fileName.toLowerCase().endsWith(".pdf")
  const isImage = document.mimeType.startsWith("image/") || /\.(jpg|jpeg|png|webp|svg)$/i.test(document.fileName)
  const isExcel = document.mimeType.includes("sheet") || document.mimeType.includes("excel") || /\.(xlsx|xls|csv)$/i.test(document.fileName)
  const isWord = document.mimeType.includes("word") || /\.(docx|doc)$/i.test(document.fileName)

  // Use API endpoint for document stream
  const previewUrl = `/api/documents/${document.id}/stream`
  const downloadUrl = `/api/documents/${document.id}/download`

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[85vh] flex flex-col p-0 gap-0 overflow-hidden bg-card border-border">
        {/* Header */}
        <DialogHeader className="p-4 border-b border-border flex flex-row items-center justify-between space-y-0 bg-muted/20">
          <div className="flex items-center gap-3 min-w-0 pr-8">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-purple-500/10 text-purple-600 border border-purple-500/20">
              {isPdf ? <FileText className="h-4.5 w-4.5 text-red-500" /> : isImage ? <ImageIcon className="h-4.5 w-4.5 text-blue-500" /> : isExcel ? <FileSpreadsheet className="h-4.5 w-4.5 text-emerald-500" /> : <File className="h-4.5 w-4.5 text-amber-500" />}
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-sm font-semibold truncate text-foreground">
                {document.fileName}
              </DialogTitle>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[11px] text-muted-foreground font-mono">
                  {formatFileSize(document.fileSize)}
                </span>
                {document.category && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 bg-muted rounded-md font-medium">
                    {document.category}
                  </Badge>
                )}
                {document.returnPeriod && (
                  <Badge variant="purple" className="text-[10px] px-1.5 py-0 h-4 rounded-md font-medium">
                    {document.returnPeriod}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 pr-6">
            <a href={downloadUrl} download={document.fileName} target="_blank" rel="noopener noreferrer">
              <Button size="sm" className="h-8 gap-1.5 text-xs bg-[#09090b] dark:bg-white text-white dark:text-[#09090b] hover:bg-neutral-800 cursor-pointer rounded-md font-medium">
                <Download className="h-3.5 w-3.5" /> Download
              </Button>
            </a>
          </div>
        </DialogHeader>

        {/* Content Viewer */}
        <div className="flex-1 overflow-auto bg-muted/40 p-4 flex items-center justify-center min-h-0">
          {isPdf ? (
            <div className="w-full h-full rounded-md overflow-hidden border border-border bg-white shadow-sm flex flex-col">
              <iframe
                src={`${previewUrl}#toolbar=1&navpanes=0`}
                className="w-full h-full border-none"
                title={document.fileName}
              />
            </div>
          ) : isImage ? (
            <div className="max-w-full max-h-full flex items-center justify-center p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewUrl}
                alt={document.fileName}
                className="max-h-[65vh] max-w-full rounded-md object-contain shadow-md border border-border"
              />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-12 text-center max-w-md bg-card rounded-lg border border-border shadow-xs">
              <div className="flex h-16 w-16 items-center justify-center rounded-md bg-muted text-muted-foreground mb-4 border border-border">
                {isExcel ? (
                  <FileSpreadsheet className="h-8 w-8 text-emerald-600" />
                ) : isWord ? (
                  <FileText className="h-8 w-8 text-blue-600" />
                ) : (
                  <File className="h-8 w-8 text-amber-600" />
                )}
              </div>
              <h4 className="text-base font-semibold text-foreground mb-1">
                {document.fileName}
              </h4>
              <p className="text-xs text-muted-foreground mb-4">
                Preview is not available in browser for this file type. Please download to view.
              </p>

              <div className="w-full grid grid-cols-2 gap-2 text-left bg-muted/50 p-3 rounded-md text-xs mb-5 border border-border">
                <div className="text-muted-foreground flex items-center gap-1.5">
                  <HardDrive className="h-3.5 w-3.5" /> Size:
                </div>
                <div className="font-semibold">{formatFileSize(document.fileSize)}</div>
                
                <div className="text-muted-foreground flex items-center gap-1.5">
                  <Tag className="h-3.5 w-3.5" /> Type:
                </div>
                <div className="font-semibold truncate">{document.mimeType}</div>

                <div className="text-muted-foreground flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" /> Uploaded:
                </div>
                <div className="font-semibold">{formatDateTime(document.createdAt)}</div>
              </div>

              <a href={downloadUrl} download={document.fileName} className="w-full">
                <Button className="w-full gap-2 bg-[#09090b] dark:bg-white text-white dark:text-[#09090b] cursor-pointer">
                  <Download className="h-4 w-4" /> Download File
                </Button>
              </a>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
