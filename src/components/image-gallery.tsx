"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import {
  fitWithin,
  formatBytes,
  IMAGE_TYPES,
  MAX_IMAGE_BYTES,
  MAX_IMAGES_PER_APPLICATION,
  MAX_UPLOAD_BATCH_BYTES,
} from "@/lib/image-input";
import { dangerButtonClass, linkButtonClass, secondaryButtonClass } from "./ui";

export type GalleryImage = { id: number; size: number; width: number | null; height: number | null };
type UploadState = { message?: string; savedAt?: number };

type Props = {
  applicationId: number;
  images: GalleryImage[];
  uploadAction: (prev: UploadState, formData: FormData) => Promise<UploadState>;
  deleteAction: (imageId: number) => Promise<void>;
};

/** 이 크기 이하이고 긴 변이 MAX_IMAGE_SIDE 이하면 원본 그대로 올린다 */
const KEEP_ORIGINAL_BYTES = 1.5 * 1024 * 1024;

type Prepared = { blob: Blob; name: string; width: number; height: number };

/** 올리기 전에 브라우저에서 줄인다. 큰 사진은 JPEG로 다시 저장. */
async function prepare(file: File): Promise<Prepared> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error(`열 수 없는 사진입니다: ${file.name} (PNG·JPG·WebP·GIF만 가능)`);
  }
  const original = { width: bitmap.width, height: bitmap.height };
  const target = fitWithin(original.width, original.height);
  const needsResize = target.width < original.width;

  // GIF는 움직임이 사라지지 않게 원본 그대로
  if (file.type === "image/gif" || (!needsResize && file.size <= KEEP_ORIGINAL_BYTES)) {
    bitmap.close();
    if (file.size > MAX_IMAGE_BYTES) {
      throw new Error(`사진이 너무 큽니다: ${file.name} (${formatBytes(file.size)}, 최대 ${formatBytes(MAX_IMAGE_BYTES)})`);
    }
    return { blob: file, name: file.name, ...original };
  }

  const canvas = document.createElement("canvas");
  canvas.width = target.width;
  canvas.height = target.height;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#fff"; // 투명한 PNG가 JPEG에서 검게 되지 않도록
  ctx.fillRect(0, 0, target.width, target.height);
  ctx.drawImage(bitmap, 0, 0, target.width, target.height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
  if (!blob) throw new Error(`사진을 변환하지 못했습니다: ${file.name}`);
  if (blob.size > MAX_IMAGE_BYTES) throw new Error(`줄여도 너무 큰 사진입니다: ${file.name}`);
  return { blob, name: file.name.replace(/\.[^.]+$/, "") + ".jpg", ...target };
}

/** 한 번의 요청이 서버 한도를 넘지 않게 묶는다 */
function toBatches(items: Prepared[]): Prepared[][] {
  const batches: Prepared[][] = [];
  let current: Prepared[] = [];
  let bytes = 0;
  for (const item of items) {
    if (current.length > 0 && bytes + item.blob.size > MAX_UPLOAD_BATCH_BYTES) {
      batches.push(current);
      current = [];
      bytes = 0;
    }
    current.push(item);
    bytes += item.blob.size;
  }
  if (current.length > 0) batches.push(current);
  return batches;
}

const isTyping = (el: EventTarget | null) =>
  el instanceof HTMLElement && (el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName));

export function ImageGallery({ applicationId, images, uploadAction, deleteAction }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const busy = pending || progress !== null;
  const full = images.length >= MAX_IMAGES_PER_APPLICATION;
  const src = (id: number) => `/applications/${applicationId}/images/${id}`;

  function upload(files: File[]) {
    const picked = files.filter((f) => f.type.startsWith("image/"));
    if (picked.length === 0 || busy) return;
    setError(null);
    if (images.length + picked.length > MAX_IMAGES_PER_APPLICATION) {
      setError(`사진은 지원 건마다 ${MAX_IMAGES_PER_APPLICATION}장까지 올릴 수 있습니다 (지금 ${images.length}장).`);
      return;
    }
    startTransition(async () => {
      try {
        setProgress("사진 준비 중…");
        const prepared = [];
        for (const file of picked) prepared.push(await prepare(file));

        let done = 0;
        for (const batch of toBatches(prepared)) {
          setProgress(`올리는 중… (${done}/${prepared.length})`);
          const fd = new FormData();
          for (const p of batch) {
            fd.append("file", p.blob, p.name);
            fd.append("width", String(p.width));
            fd.append("height", String(p.height));
          }
          const result = await uploadAction({}, fd);
          if (result.message) throw new Error(result.message);
          done += batch.length;
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "사진을 올리지 못했습니다.");
      } finally {
        setProgress(null);
      }
    });
  }

  // 화면 어디서든 붙여넣기(⌘/Ctrl+V)로 스크린샷 추가. 입력 칸에서 붙여넣을 때는 건드리지 않는다.
  const uploadRef = useRef(upload);
  useEffect(() => {
    uploadRef.current = upload;
  });
  useEffect(() => {
    function onPaste(e: ClipboardEvent) {
      if (isTyping(e.target)) return;
      const files = Array.from(e.clipboardData?.files ?? []).filter((f) => f.type.startsWith("image/"));
      if (files.length === 0) return;
      e.preventDefault();
      uploadRef.current(files);
    }
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, []);

  return (
    <div
      onDragOver={(e) => {
        if (!e.dataTransfer.types.includes("Files")) return;
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDragging(false);
      }}
      onDrop={(e) => {
        if (!e.dataTransfer.types.includes("Files")) return;
        e.preventDefault();
        setDragging(false);
        upload(Array.from(e.dataTransfer.files));
      }}
      className={`flex flex-col gap-3 rounded-lg transition-colors ${dragging ? "bg-blue-50 ring-2 ring-blue-400 dark:bg-blue-950/40" : ""}`}
    >
      {images.length > 0 ? (
        <ul className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-6">
          {images.map((img, i) => (
            <li key={img.id}>
              <button
                type="button"
                onClick={() => setOpenIndex(i)}
                className="block aspect-square w-full overflow-hidden rounded-lg border border-zinc-200 bg-zinc-100 outline-none hover:opacity-90 focus-visible:ring-3 focus-visible:ring-blue-500/40 dark:border-zinc-800 dark:bg-zinc-900"
                aria-label={`사진 ${i + 1} 크게 보기`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- 로그인 쿠키가 필요한 주소라 next/image 최적화를 쓰지 않는다 */}
                <img src={src(img.id)} alt="" loading="lazy" decoding="async" className="size-full object-cover" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-zinc-400">사진 없음</p>
      )}

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy || full}
          className={`${secondaryButtonClass} h-9 px-3`}
        >
          {busy ? (progress ?? "올리는 중…") : "사진 추가"}
        </button>
        <span className="text-xs text-zinc-500">
          {full
            ? `최대 ${MAX_IMAGES_PER_APPLICATION}장까지 올렸습니다`
            : "PNG·JPG·WebP·GIF, 끌어 놓거나 붙여넣기(⌘/Ctrl+V)도 됩니다"}
        </span>
        <input
          ref={inputRef}
          type="file"
          accept={IMAGE_TYPES.join(",")}
          multiple
          hidden
          onChange={(e) => {
            upload(Array.from(e.currentTarget.files ?? []));
            e.currentTarget.value = ""; // 같은 파일을 다시 골라도 동작하도록
          }}
        />
      </div>
      {error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      {openIndex !== null && images[openIndex] && (
        <Lightbox
          images={images}
          index={openIndex}
          src={src}
          onIndexChange={setOpenIndex}
          onClose={() => setOpenIndex(null)}
          onDelete={async (id) => {
            await deleteAction(id);
            // 지운 뒤에는 다음 사진을, 마지막이었으면 이전 사진을 보여준다
            const rest = images.length - 1;
            setOpenIndex(rest === 0 ? null : Math.min(openIndex, rest - 1));
          }}
        />
      )}
    </div>
  );
}

function Lightbox({
  images,
  index,
  src,
  onIndexChange,
  onClose,
  onDelete,
}: {
  images: GalleryImage[];
  index: number;
  src: (id: number) => string;
  onIndexChange: (i: number) => void;
  onClose: () => void;
  onDelete: (id: number) => Promise<void>;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [deleting, startDelete] = useTransition();
  const image = images[index];
  const count = images.length;
  const go = (step: number) => onIndexChange((index + step + count) % count);

  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        // 사진·버튼 바깥(어두운 부분)을 누르면 닫는다
        if (e.target === e.currentTarget || (e.target as HTMLElement).dataset.backdrop) ref.current?.close();
      }}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") go(1);
        if (e.key === "ArrowLeft") go(-1);
      }}
      aria-label="사진 크게 보기"
      className="m-0 h-dvh max-h-none w-screen max-w-none bg-zinc-950/95 p-0 text-white outline-none backdrop:bg-black/60"
    >
      <div className="flex h-full flex-col" data-backdrop="1">
        <div className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
          <span className="tabular-nums text-zinc-300">
            {index + 1} / {count}
            <span className="ml-3 text-xs text-zinc-400">
              {image.width && image.height ? `${image.width}×${image.height} · ` : ""}
              {formatBytes(image.size)}
            </span>
          </span>
          <div className="flex items-center gap-3">
            <a href={src(image.id)} target="_blank" rel="noopener noreferrer" className={`${linkButtonClass} text-zinc-300 hover:text-white`}>
              원본 새 탭 ↗
            </a>
            <button
              type="button"
              disabled={deleting}
              onClick={() => {
                if (!confirm("이 사진을 삭제할까요? 되돌릴 수 없습니다.")) return;
                startDelete(() => onDelete(image.id));
              }}
              className={`${dangerButtonClass} h-8 px-3`}
            >
              {deleting ? "삭제 중…" : "삭제"}
            </button>
            <button
              type="button"
              onClick={() => ref.current?.close()}
              className="inline-flex size-8 items-center justify-center rounded-lg text-xl text-zinc-300 hover:bg-white/10 hover:text-white"
              aria-label="닫기"
              autoFocus
            >
              ×
            </button>
          </div>
        </div>

        <div className="relative flex min-h-0 flex-1 items-center justify-center px-2 pb-4 sm:px-16" data-backdrop="1">
          {/* eslint-disable-next-line @next/next/no-img-element -- 로그인 쿠키가 필요한 주소 */}
          <img key={image.id} src={src(image.id)} alt={`사진 ${index + 1}`} className="max-h-full max-w-full rounded object-contain shadow-2xl" />
          {count > 1 && (
            <>
              <NavButton side="left" onClick={() => go(-1)} />
              <NavButton side="right" onClick={() => go(1)} />
            </>
          )}
        </div>
      </div>
    </dialog>
  );
}

function NavButton({ side, onClick }: { side: "left" | "right"; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={side === "left" ? "이전 사진" : "다음 사진"}
      className={`absolute top-1/2 ${side === "left" ? "left-2" : "right-2"} inline-flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-2xl text-white hover:bg-black/70`}
    >
      {side === "left" ? "‹" : "›"}
    </button>
  );
}
