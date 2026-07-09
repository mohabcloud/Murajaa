// src/lib/utils.js
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { getQuranData } from './quranData';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export const isIframe = window.self !== window.top;

function versesToPages(verses, startPage = 1) {
  const data = getQuranData();
  if (!data) {
    return Math.max(1, Math.ceil(verses / 10));
  }

  let remaining = verses;
  let pages = 0;
  let currentPage = startPage;
  while (remaining > 0 && currentPage <= 604) {
    const vc = data.pageMap[currentPage]?.verseCount || 10;
    remaining -= vc;
    pages++;
    currentPage++;
  }
  return Math.max(1, pages);
}

export function formatQuranUnits(verses, startPage = 1) {
  if (!verses || verses === 0) return "—";
  const pages = versesToPages(verses, startPage);
  const juz = Math.floor(pages / 20);
  const remainingPages = pages % 20;

  if (juz >= 1) {
    if (remainingPages > 0) return `${juz} أجزاء و ${remainingPages} صفحات`;
    return `${juz} أجزاء`;
  }
  return `${pages} صفحة`;
}

export function smartQuranDisplay(verses, startPage = 1) {
  if (!verses || verses <= 0) return "—";

  const pagesCovered = versesToPages(verses, startPage);
  const juzCount = Math.floor(pagesCovered / 20);
  const remainingPages = pagesCovered % 20;

  if (juzCount >= 1) {
    return remainingPages > 0
      ? `${juzCount} أجزاء و ${remainingPages} صفحات`
      : `${juzCount} أجزاء`;
  }

  return `${pagesCovered} صفحة`;
}

export function stripOrnament(text) {
  if (!text) return "";
  return text.replace(/[\u06DD-\u06DF\uFD3E\uFD3F\ufdfd\ufdfa\ufdfb\ufdfc\ufdfd\ufe80-\ufefc\s]+/u, "").trim();
}