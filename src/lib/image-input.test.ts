import { describe, expect, it } from "vitest";
import { detectImageType, fitWithin, formatBytes, parseDimension } from "./image-input";

const bytes = (...b: number[]) => new Uint8Array([...b, ...new Array(16).fill(0)]);

describe("detectImageType", () => {
  it("시그니처로 형식을 판별한다", () => {
    expect(detectImageType(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a))).toBe("image/png");
    expect(detectImageType(bytes(0xff, 0xd8, 0xff, 0xe0))).toBe("image/jpeg");
    expect(detectImageType(bytes(0x47, 0x49, 0x46, 0x38, 0x39, 0x61))).toBe("image/gif");
    expect(detectImageType(bytes(0x47, 0x49, 0x46, 0x38, 0x37, 0x61))).toBe("image/gif");
    expect(detectImageType(bytes(0x52, 0x49, 0x46, 0x46, 1, 2, 3, 4, 0x57, 0x45, 0x42, 0x50))).toBe("image/webp");
  });
  it("이름만 바꾼 파일·다른 형식은 거부한다", () => {
    expect(detectImageType(new TextEncoder().encode("<svg xmlns='http://www.w3.org/2000/svg'/>"))).toBeNull();
    expect(detectImageType(new TextEncoder().encode("%PDF-1.7"))).toBeNull();
    expect(detectImageType(bytes(0x52, 0x49, 0x46, 0x46, 1, 2, 3, 4, 0x57, 0x41, 0x56, 0x45))).toBeNull(); // WAV
    expect(detectImageType(new Uint8Array())).toBeNull();
  });
});

describe("fitWithin", () => {
  it("작으면 그대로", () => {
    expect(fitWithin(1200, 800)).toEqual({ width: 1200, height: 800 });
    expect(fitWithin(2000, 2000)).toEqual({ width: 2000, height: 2000 });
  });
  it("긴 변을 기준으로 비율 유지", () => {
    expect(fitWithin(4000, 3000)).toEqual({ width: 2000, height: 1500 });
    expect(fitWithin(1170, 2532)).toEqual({ width: 924, height: 2000 });
    expect(fitWithin(10000, 1, 100)).toEqual({ width: 100, height: 1 });
  });
});

describe("parseDimension", () => {
  it("양의 정수만", () => {
    expect(parseDimension("1200")).toBe(1200);
    expect(parseDimension("0")).toBeNull();
    expect(parseDimension("12.5")).toBeNull();
    expect(parseDimension("abc")).toBeNull();
    expect(parseDimension(null)).toBeNull();
  });
});

describe("formatBytes", () => {
  it("단위", () => {
    expect(formatBytes(500)).toBe("500 B");
    expect(formatBytes(340 * 1024)).toBe("340 KB");
    expect(formatBytes(1.25 * 1024 * 1024)).toBe("1.3 MB");
  });
});
