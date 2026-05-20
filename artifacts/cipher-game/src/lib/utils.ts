import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const MIME_TYPES: Record<string, string> = {
  mp3: "audio/mpeg", ogg: "audio/ogg", wav: "audio/wav", m4a: "audio/mp4",
  mp4: "video/mp4", webm: "video/webm", mov: "video/quicktime",
  png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif",
  svg: "image/svg+xml", webp: "image/webp",
};

function mimeFromUrl(url: string): string {
  const ext = url.split(".").pop()?.toLowerCase().split("?")[0] || "";
  return MIME_TYPES[ext] || "application/octet-stream";
}

export async function convertToBlobUrl(url: string): Promise<string> {
  if (url.startsWith("blob:") || url.startsWith("data:")) return url;
  try {
    const proxyUrl = `https://corsproxy.io/?url=${encodeURIComponent(url)}`;
    const res = await fetch(proxyUrl);
    if (!res.ok) throw new Error(`fetch failed: ${res.status}`);
    const buf = await res.arrayBuffer();
    const blob = new Blob([buf], { type: mimeFromUrl(url) });
    return URL.createObjectURL(blob);
  } catch {
    return url;
  }
}
