import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

export function formatDate(dateString: string | Date | null | undefined): string {
  if (!dateString) return "-";
  try {
    const d = typeof dateString === "string" ? new Date(dateString) : dateString;
    if (isNaN(d.getTime())) return String(dateString);
    return d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return String(dateString);
  }
}

export function formatDateTime(dateString: string | Date | null | undefined): string {
  if (!dateString) return "-";
  try {
    const d = typeof dateString === "string" ? new Date(dateString) : dateString;
    if (isNaN(d.getTime())) return String(dateString);
    return d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return String(dateString);
  }
}
