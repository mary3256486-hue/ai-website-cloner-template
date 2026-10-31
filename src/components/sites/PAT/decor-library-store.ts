"use client";

import { useCallback, useEffect, useState } from "react";
import type { DecorItem } from "./decor-library";

export interface CustomDecorItem {
  id: string;
  label: string;
  src: string;
  width: number;
  height: number;
}

const STORAGE_KEY = "phatue.decorLibrary.v1";
const MAX_BYTES = 1_600_000;

function read(): CustomDecorItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is CustomDecorItem =>
        Boolean(item?.id && item?.src && item?.label && item?.width && item?.height),
    );
  } catch {
    return [];
  }
}

function persist(items: CustomDecorItem[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // ignore quota failures; the item still works for this session
  }
}

export function customToDecorItem(item: CustomDecorItem): DecorItem {
  const maxSide = 140;
  const scale = Math.min(maxSide / Math.max(1, item.width), maxSide / Math.max(1, item.height));
  return {
    id: item.id,
    label: item.label,
    category: "custom",
    slot: "right",
    width: Math.max(32, Math.round(item.width * scale)),
    height: Math.max(20, Math.round(item.height * scale)),
    nativeWidth: item.width,
    nativeHeight: item.height,
    src: item.src,
    credit: "Thư viện của bạn",
  };
}

export function useCustomDecor() {
  const [items, setItems] = useState<CustomDecorItem[]>([]);

  useEffect(() => {
    // The library lives in localStorage, so it can only load after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setItems(read());
  }, []);

  const add = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) throw new Error("Chỉ nhận tệp ảnh.");
    if (file.size > MAX_BYTES) throw new Error("Ảnh quá lớn, chọn tệp dưới 1,6 MB.");
    const src = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error("Không đọc được tệp ảnh."));
      reader.readAsDataURL(file);
    });
    const size = await new Promise<{ width: number; height: number }>((resolve) => {
      const image = new window.Image();
      image.onload = () => resolve({ width: image.naturalWidth || 120, height: image.naturalHeight || 90 });
      image.onerror = () => resolve({ width: 120, height: 90 });
      image.src = src;
    });
    const item: CustomDecorItem = {
      id: `custom-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      label: file.name.replace(/\.[^.]+$/, "") || "Hình của tôi",
      src,
      width: size.width,
      height: size.height,
    };
    const next = [...read(), item];
    persist(next);
    setItems(next);
    return item;
  }, []);

  const remove = useCallback((id: string) => {
    const next = read().filter((item) => item.id !== id);
    persist(next);
    setItems(next);
  }, []);

  return { customItems: items, add, remove };
}
