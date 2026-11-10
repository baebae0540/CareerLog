// 지원 건 사진 검증 (순수 함수). 서버 액션과 사진 컴포넌트가 함께 쓴다.

export const IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"] as const;
export type ImageMime = (typeof IMAGE_TYPES)[number];

/** 장당 최대 크기. 브라우저에서 줄여 올리므로 보통 수백 KB */
export const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
/** 지원 건당 최대 장수 */
export const MAX_IMAGES_PER_APPLICATION = 30;
/** 긴 변이 이보다 크면 브라우저에서 줄인다 */
export const MAX_IMAGE_SIDE = 2000;
/** 한 번의 서버 액션 요청에 담는 최대 바이트 (next.config의 bodySizeLimit 4mb보다 여유 있게) */
export const MAX_UPLOAD_BATCH_BYTES = 3.5 * 1024 * 1024;

/**
 * 파일 앞부분의 시그니처로 형식을 판별한다. 확장자·브라우저가 붙인 MIME은 믿지 않는다.
 * 알 수 없는 형식이면 null.
 */
export function detectImageType(bytes: Uint8Array): ImageMime | null {
  const starts = (sig: number[], offset = 0) => sig.every((b, i) => bytes[offset + i] === b);
  if (starts([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "image/png";
  if (starts([0xff, 0xd8, 0xff])) return "image/jpeg";
  if (starts([0x47, 0x49, 0x46, 0x38]) && (bytes[4] === 0x37 || bytes[4] === 0x39) && bytes[5] === 0x61) return "image/gif";
  // RIFF....WEBP
  if (starts([0x52, 0x49, 0x46, 0x46]) && starts([0x57, 0x45, 0x42, 0x50], 8)) return "image/webp";
  return null;
}

/** 긴 변이 max 이하가 되도록 비율을 유지해 줄인 크기. 이미 작으면 그대로. */
export function fitWithin(width: number, height: number, max = MAX_IMAGE_SIDE): { width: number; height: number } {
  const longest = Math.max(width, height);
  if (longest <= max) return { width, height };
  const scale = max / longest;
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

/** 폼에서 받은 너비·높이 (브라우저가 잰 값). 이상하면 null로 저장한다. */
export function parseDimension(value: FormDataEntryValue | null): number | null {
  if (typeof value !== "string") return null;
  const n = Number(value);
  return Number.isInteger(n) && n > 0 && n <= 20000 ? n : null;
}

/** 크기를 사람이 읽기 좋게 (예: 340 KB, 1.2 MB) */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
