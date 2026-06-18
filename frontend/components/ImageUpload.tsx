"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Language } from "@/lib/i18n";

type Props = {
  onImageSelect: (file: File | null) => void;
  lang: Language;
};

const texts = {
  en: {
    drop_text: "Drop image here or click",
    upload_btn: "Upload Screenshot",
    supports: "Supports JPG, PNG, WEBP",
    max_size: "Max 10MB",
    paste_hint: "Or paste image (Ctrl+V / Cmd+V)",
    ready: "Image ready!",
    change: "Change Image",
  },
  ru: {
    drop_text: "Перетащите или нажмите",
    upload_btn: "Загрузить скриншот",
    supports: "JPG, PNG, WEBP",
    max_size: "Макс. 10МБ",
    paste_hint: "Или вставьте (Ctrl+V / Cmd+V)",
    ready: "Изображение готово!",
    change: "Изменить",
  },
  uz: {
    drop_text: "Rasmni tashlang yoki bosing",
    upload_btn: "Screenshot yuklash",
    supports: "JPG, PNG, WEBP",
    max_size: "Maks 10MB",
    paste_hint: "Yoki joylashtiring (Ctrl+V / Cmd+V)",
    ready: "Rasm tayyor!",
    change: "O'zgartirish",
  },
} satisfies Record<Language, Record<string, string>>;

export function ImageUpload({ onImageSelect, lang }: Props) {
  const t = texts[lang];
  const [preview, setPreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFile = useCallback((file: File | null | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setPreview(String(event.target?.result || ""));
      onImageSelect(file);
    };
    reader.readAsDataURL(file);
  }, [onImageSelect]);

  const handlePaste = useCallback((event: ClipboardEvent) => {
    const items = event.clipboardData?.items;
    if (!items) return;
    for (const item of Array.from(items)) {
      if (item.type.startsWith("image/")) {
        handleFile(item.getAsFile());
        break;
      }
    }
  }, [handleFile]);

  useEffect(() => {
    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [handlePaste]);

  if (preview) {
    return (
      <div className="border border-[#FFD700]/30 bg-[#FFD700]/5 p-4 text-center">
        <p className="text-lg font-semibold text-white">✅ {t.ready}</p>
        <div className="relative mx-auto mt-4 max-h-[320px] max-w-full overflow-hidden border-2 border-[#FFD700]/70 bg-black/40">
          <Image alt="Passage screenshot preview" className="h-auto max-h-[320px] w-full object-contain" height={640} src={preview} width={900} unoptimized />
        </div>
        <button
          className="mt-4 min-h-11 border border-white/15 bg-black/20 px-5 text-sm font-black uppercase tracking-[0.12em] text-white/70 hover:border-[#FFD700]/50 hover:text-[#FFD700]"
          onClick={() => {
            setPreview(null);
            onImageSelect(null);
          }}
          type="button"
        >
          🔄 {t.change}
        </button>
      </div>
    );
  }

  return (
    <div
      className={[
        "cursor-pointer border-2 border-dashed border-[#FFD700]/80 bg-[#FFD700]/[0.03] px-5 py-10 text-center transition",
        isDragging ? "scale-[1.01] bg-[#FFD700]/10" : "hover:bg-[#FFD700]/[0.08]",
      ].join(" ")}
      onClick={() => fileInputRef.current?.click()}
      onDragLeave={() => setIsDragging(false)}
      onDragOver={(event) => {
        event.preventDefault();
        setIsDragging(true);
      }}
      onDrop={(event) => {
        event.preventDefault();
        setIsDragging(false);
        const file = event.dataTransfer.files[0];
        if (file?.type.startsWith("image/")) handleFile(file);
      }}
      role="button"
      tabIndex={0}
    >
      <input
        accept="image/jpeg,image/jpg,image/png,image/webp"
        className="hidden"
        onChange={(event) => handleFile(event.target.files?.[0])}
        ref={fileInputRef}
        type="file"
      />
      <span className="block text-5xl">📸</span>
      <p className="mt-4 text-lg font-semibold text-white">{t.drop_text}</p>
      <span className="mt-4 inline-flex min-h-11 items-center justify-center bg-[#FFD700] px-6 text-sm font-black uppercase tracking-[0.12em] text-black">
        {t.upload_btn} →
      </span>
      <p className="mt-4 text-sm text-white/50">{t.supports} • {t.max_size}</p>
      <p className="mt-2 text-sm text-[#FFD700]/75">{t.paste_hint}</p>
    </div>
  );
}
