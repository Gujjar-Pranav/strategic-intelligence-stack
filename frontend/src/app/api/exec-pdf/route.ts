// src/app/api/exec-pdf/route.ts
import { NextResponse } from "next/server";
import puppeteer, { type Browser } from "puppeteer-core";
import chromium from "@sparticuz/chromium";
import fs from "fs";
import path from "path";
import { createRequire } from "module";

import {
  EXEC_EXPORT_KEY,
  type ExecExportPayload,
} from "@/components/dashboard/segmentation/exports/exportPayload";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const require = createRequire(import.meta.url);

function safeStr(x: unknown) {
  return typeof x === "string" ? x : "";
}

function todayStamp(isoLike?: string) {
  if (!isoLike) return "";
  const d = new Date(isoLike);
  if (Number.isNaN(d.getTime())) return String(isoLike);
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

function firstExisting(pathsToTry: string[]) {
  for (const p of pathsToTry) {
    try {
      if (p && fs.existsSync(p)) return p;
    } catch {
      // ignore
    }
  }
  return "";
}

/**
 * Sometimes Vercel bundling can omit chromium's auxiliary files unless traced.
 * We try plain chromium.executablePath() first, then fallback to passing a resolved bin dir.
 */
function chromiumBinDir(): string {
  try {
    let p = require.resolve("@sparticuz/chromium");

    for (let i = 0; i < 12; i++) {
      const dir = path.dirname(p);
      const candidateBin = path.join(dir, "bin");
      if (fs.existsSync(candidateBin)) return candidateBin;
      p = dir;
    }
  } catch {
    // ignore
  }
  return "";
}

async function resolveChromeExecutablePath(): Promise<string> {
  const envPath =
    process.env.CHROME_PATH ||
    process.env.PUPPETEER_EXECUTABLE_PATH ||
    process.env.PUPPETEER_CHROMIUM_EXECUTABLE_PATH;

  if (envPath && fs.existsSync(envPath)) return envPath;

  const isVercel = !!process.env.VERCEL;
  if (isVercel) {
    // Preferred
    try {
      const p = await chromium.executablePath();
      if (p && fs.existsSync(p)) return p;
    } catch {
      // fallback below
    }

    // Fallback (when chromium needs explicit bin dir)
    const bin = chromiumBinDir();
    if (bin) {
      try {
        const p = await chromium.executablePath(bin);
        if (p && fs.existsSync(p)) return p;
      } catch {
        // ignore
      }
    }
  }

  const platform = process.platform;

  if (platform === "darwin") {
    return firstExisting([
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      "/Applications/Chromium.app/Contents/MacOS/Chromium",
      "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
      "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
    ]);
  }

  if (platform === "win32") {
    const pf = process.env.PROGRAMFILES || "C:\\Program Files";
    const pfx = process.env["PROGRAMFILES(X86)"] || "C:\\Program Files (x86)";
    const lu = process.env.LOCALAPPDATA || "";
    return firstExisting([
      `${pf}\\Google\\Chrome\\Application\\chrome.exe`,
      `${pfx}\\Google\\Chrome\\Application\\chrome.exe`,
      `${lu}\\Google\\Chrome\\Application\\chrome.exe`,
      `${pf}\\Microsoft\\Edge\\Application\\msedge.exe`,
      `${pfx}\\Microsoft\\Edge\\Application\\msedge.exe`,
      `${pf}\\BraveSoftware\\Brave-Browser\\Application\\brave.exe`,
      `${pfx}\\BraveSoftware\\Brave-Browser\\Application\\brave.exe`,
    ]);
  }

  return firstExisting([
    "/usr/bin/google-chrome-stable",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium-browser",
    "/usr/bin/chromium",
    "/snap/bin/chromium",
    "/usr/bin/microsoft-edge",
    "/usr/bin/brave-browser",
  ]);
}

function computeBaseUrl(req: Request): string {
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "";
  const xfProto = req.headers.get("x-forwarded-proto");

  // IMPORTANT: on Vercel, default MUST be https (http often fails)
  const proto = xfProto || (process.env.VERCEL ? "https" : "http");

  return host ? `${proto}://${host}` : "http://localhost:3000";
}

export async function POST(req: Request) {
  let browser: Browser | null = null;

  try {
    const payload = (await req.json()) as ExecExportPayload;

    const baseUrl = computeBaseUrl(req);

    const manifest = (payload as { manifest?: unknown })?.manifest as
      | Record<string, unknown>
      | undefined;

    const run = (manifest?.["run"] as Record<string, unknown> | undefined) ?? undefined;

    const createdAt =
      (run?.["created_at_utc"] as string | undefined) ||
      (run?.["created_at"] as string | undefined) ||
      (manifest?.["created_at_utc"] as string | undefined) ||
      (manifest?.["created_at"] as string | undefined);

    const dataset =
      (manifest?.["dataset"] as Record<string, unknown> | undefined) ?? undefined;

    const clientLabel =
      safeStr(dataset?.["client_name"]) ||
      safeStr(manifest?.["client_name"]) ||
      "Customer Segmentation";

    const reportTitle = "Segmentation & Growth Recommendations";
    const confidentiality = "Confidential — For internal use only";
    const dateLabel = todayStamp(createdAt) || todayStamp(new Date().toISOString());

    const executablePath = await resolveChromeExecutablePath();
    if (!executablePath) {
      return new NextResponse(
        "Chrome executable not found. Set CHROME_PATH (or PUPPETEER_EXECUTABLE_PATH).",
        { status: 500 }
      );
    }

    const isVercel = !!process.env.VERCEL;

    browser = await puppeteer.launch({
      executablePath,
      // ✅ do not use chromium.headless (not in typings). This works in puppeteer v24+
      headless: true,
      defaultViewport: { width: 1240, height: 1754 },
      args: isVercel
        ? chromium.args
        : [
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-dev-shm-usage",
            "--disable-gpu",
          ],
    });

    const page = await browser.newPage();

    // Put payload into sessionStorage before any scripts execute
    const raw = JSON.stringify(payload);
    await page.evaluateOnNewDocument(
      (k: string, v: string) => {
        try {
          sessionStorage.setItem(k, v);
        } catch {
          // ignore
        }
      },
      EXEC_EXPORT_KEY,
      raw
    );

    const url = `${baseUrl}/export/executive?print=1`;

    // ✅ networkidle0 can hang on Vercel sometimes; domcontentloaded is enough
    await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });

    // Wait for the React page to hydrate + render
    await page.waitForSelector(".exec-print-root", { timeout: 60_000 });
    await page.waitForSelector(".exec-print-charts .recharts-surface", {
      timeout: 60_000,
    });

    // Fonts (best-effort)
    try {
      await page.waitForFunction(
        () =>
          (document as unknown as { fonts?: { status?: string } }).fonts?.status ===
          "loaded",
        { timeout: 30_000 }
      );
    } catch {
      // ignore
    }

    // small settle
    await new Promise((r) => setTimeout(r, 250));

    const footerTemplate = `
      <div style="width:100%; padding:0 14mm; font-size:10px; color:#475569;">
        <div style="display:flex; align-items:center; justify-content:space-between; width:100%;">
          <div style="flex:1; text-align:left; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
            ${clientLabel}
          </div>
          <div style="flex:1; text-align:center; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
            ${confidentiality} · ${reportTitle}
          </div>
          <div style="flex:1; text-align:right; white-space:nowrap;">
            ${dateLabel} · Page <span class="pageNumber"></span> of <span class="totalPages"></span>
          </div>
        </div>
      </div>
    `;

    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
      displayHeaderFooter: true,
      headerTemplate: `<div></div>`,
      footerTemplate,
      margin: {
        top: "14mm",
        right: "14mm",
        bottom: "18mm",
        left: "14mm",
      },
    });

    await browser.close();
    browser = null;

    const filename = `executive-summary-${new Date().toISOString().slice(0, 10)}.pdf`;

    const buf = Buffer.from(pdf);
    const body = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);

    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e: unknown) {
    try {
      await browser?.close();
    } catch {
      // ignore
    }
    const msg = e instanceof Error ? e.message : "Failed to generate PDF";
    return new NextResponse(msg, { status: 500 });
  }
}
