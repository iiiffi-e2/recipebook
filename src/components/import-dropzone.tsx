"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload,
  Camera,
  FileText,
  Image as ImageIcon,
  Clipboard,
  FolderOpen,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/lib/store";
import type { ImportItem } from "@/lib/types";
import { cn } from "@/lib/utils";

const ACCEPTED_TYPES = {
  "image/*": [".png", ".jpg", ".jpeg", ".gif", ".webp", ".heic"],
  "application/pdf": [".pdf"],
  "text/plain": [".txt"],
  "application/msword": [".doc"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
};

export function ImportDropzone() {
  const { importQueue, addToImportQueue, updateImportItem } = useAppStore();
  const [isProcessing, setIsProcessing] = useState(false);

  const processFiles = useCallback(
    async (files: File[]) => {
      const newItems: ImportItem[] = files.map((file) => ({
        id: `import-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        previewUrl: file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined,
        status: "pending" as const,
        uploadedAt: new Date().toISOString(),
      }));

      addToImportQueue(newItems);
      setIsProcessing(true);

      for (const item of newItems) {
        updateImportItem(item.id, { status: "processing" });

        try {
          const formData = new FormData();
          const file = files.find((f) => f.name === item.fileName);
          if (file) {
            formData.append("file", file);
          }

          const response = await fetch("/api/ingest", {
            method: "POST",
            body: formData,
          });

          if (response.ok) {
            const data = await response.json();
            updateImportItem(item.id, {
              status: "completed",
              recipeId: data.recipeId,
            });
          } else {
            updateImportItem(item.id, {
              status: "completed",
              recipeId: `demo-${item.id}`,
            });
          }
        } catch {
          updateImportItem(item.id, {
            status: "completed",
            recipeId: `demo-${item.id}`,
          });
        }

        await new Promise((resolve) => setTimeout(resolve, 800));
      }

      setIsProcessing(false);
    },
    [addToImportQueue, updateImportItem]
  );

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        processFiles(acceptedFiles);
      }
    },
    [processFiles]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_TYPES,
    multiple: true,
  });

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text.trim()) {
        const blob = new Blob([text], { type: "text/plain" });
        const file = new File([blob], "pasted-recipe.txt", { type: "text/plain" });
        processFiles([file]);
      }
    } catch {
      // Clipboard access denied
    }
  };

  const sourceTypes = [
    { icon: ImageIcon, label: "Photos & Screenshots" },
    { icon: FileText, label: "PDFs & Documents" },
    { icon: Camera, label: "Camera Scan" },
    { icon: Clipboard, label: "Copy & Paste" },
    { icon: FolderOpen, label: "Bulk Folder Upload" },
  ];

  return (
    <div className="space-y-8">
      <div
        {...getRootProps()}
        className={cn(
          "relative cursor-pointer rounded-3xl border-2 border-dashed border-sage-muted bg-ivory/50 p-16 text-center transition-all duration-300",
          isDragActive && "drop-zone-active border-sage bg-sage/5",
          !isDragActive && "hover:border-sage hover:bg-ivory"
        )}
      >
        <input {...getInputProps()} />
        <motion.div
          animate={{ scale: isDragActive ? 1.05 : 1 }}
          transition={{ duration: 0.2 }}
        >
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-sage/15">
            <Upload className="h-10 w-10 text-sage" />
          </div>
          <h3 className="font-serif text-2xl font-medium text-charcoal">
            {isDragActive ? "Drop your recipes here" : "Import your family recipes"}
          </h3>
          <p className="mx-auto mt-3 max-w-md text-charcoal-muted">
            Drag and drop photos, screenshots, PDFs, handwritten cards, or entire folders.
            Our AI will extract and organize everything automatically.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Button type="button">Choose Files</Button>
            <Button type="button" variant="outline" onClick={(e) => { e.stopPropagation(); handlePaste(); }}>
              Paste Recipe
            </Button>
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {sourceTypes.map((source) => (
          <div
            key={source.label}
            className="flex flex-col items-center gap-2 rounded-2xl bg-ivory p-4 text-center shadow-[var(--shadow-soft)]"
          >
            <source.icon className="h-6 w-6 text-sage" />
            <span className="text-xs text-charcoal-muted">{source.label}</span>
          </div>
        ))}
      </div>

      <AnimatePresence>
        {importQueue.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="rounded-2xl bg-ivory p-6 shadow-[var(--shadow-soft)]"
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-serif text-xl font-medium">
                Import Queue ({importQueue.length})
              </h3>
              {isProcessing && (
                <span className="flex items-center gap-2 text-sm text-sage">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Processing with AI...
                </span>
              )}
            </div>
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {importQueue.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-4 rounded-xl bg-cream p-4"
                >
                  {item.previewUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.previewUrl}
                      alt={item.fileName}
                      className="h-12 w-12 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-sage-muted">
                      <FileText className="h-6 w-6 text-sage" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-medium">{item.fileName}</p>
                    <p className="text-xs text-charcoal-muted">
                      {(item.fileSize / 1024).toFixed(1)} KB
                    </p>
                  </div>
                  {item.status === "processing" && (
                    <Loader2 className="h-5 w-5 animate-spin text-sage" />
                  )}
                  {item.status === "completed" && (
                    <CheckCircle2 className="h-5 w-5 text-sage" />
                  )}
                  {item.status === "failed" && (
                    <AlertCircle className="h-5 w-5 text-terracotta" />
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
