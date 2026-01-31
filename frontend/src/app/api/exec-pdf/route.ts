// app/api/exec-pdf/route.ts
import { NextResponse } from "next/server";
import puppeteer from "puppeteer-core";
import chromium from "@sparticuz/chromium";
import fs from "fs";

import {
  EXEC_EXPORT_KEY,
  ExecExportPayload,
} from "@/components/dashboard/segmentation/exports/exportPayload";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type UnknownRecord = Record<string, unknown>;

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

function firstExisting(paths: string[]) {
  for (const p of paths) {
    try {
      if (p && fs.existsSync(p)) return p;
    } catch {
      // ignore
    }
  }
  return "";
}

async function resolveChromeExecutablePath() {
  // If user provides explicit Chrome path, prefer it (works local + prod)
  const envPath =
    process.env.CHROME_PATH ||
    process.env.PUPPETEER_EXECUTABLE_PATH ||
    process.env.PUPPETEER_CHROMIUM_EXECUTABLE_PATH;

  if (envPath && fs.existsSync(envPath)) return envPath;

  // Vercel/serverless: use Sparticuz Chromium
  const isVercel = !!process.env.VERCEL;
  if (isVercel) {
    const p = await chromium.executablePath();
    if (p && fs.existsSync(p)) return p;
  }

  // Local dev fallbacks (common installs)
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

  // linux
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

function getErrorMessage(e: unknown) {
  if (e instanceof Error) return e.message;
  if (typeof e === "string") return e;
  try {
    return JSON.stringify(e);
  } catch {
    return "Failed to generate PDF";
  }
}

export async function POST(req: Request) {
  try {
    const payload = (await req.json()) as ExecExportPayload;

    const host =
      req.headers.get("x-forwarded-host") || req.headers.get("host");
    const proto = req.headers.get("x-forwarded-proto") || "http";
    const baseUrl = host ? `${proto}://${host}` : "http://localhost:3000";

    const payloadAny = payload as unknown as UnknownRecord;
    const manifest =
      (payloadAny["manifest"] as UnknownRecord | undefined) ?? undefined;

    const run = (manifest?.["run"] as UnknownRecord | undefined) ?? undefined;

    const createdAt =
      safeStr(run?.["created_at_utc"]) ||
      safeStr(run?.["created_at"]) ||
      safeStr(manifest?.["created_at_utc"]) ||
      safeStr(manifest?.["created_at"]);

    const dataset =
      (manifest?.["dataset"] as UnknownRecord | undefined) ?? undefined;

    const clientLabel =
      safeStr(dataset?.["client_name"]) ||
      safeStr(manifest?.["client_name"]) ||
      "Customer Segmentation";

    const reportTitle = "Segmentation & Growth Recommendations";
    const confidentiality = "Confidential — For internal use only";
    const dateLabel =
      todayStamp(createdAt) || todayStamp(new Date().toISOString());

    const executablePath = await resolveChromeExecutablePath();
    if (!executablePath) {
      return new NextResponse(
        "Chrome executable not found. Set CHROME_PATH (or PUPPETEER_EXECUTABLE_PATH).",
        { status: 500 }
      );
    }

    const isVercel = !!process.env.VERCEL;

    const browser = await puppeteer.launch({
      executablePath,
      headless: isVercel ? chromium.headless : true,
      defaultViewport: { width: 1240, height: 1754 }, // stable A4-ish render
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

    // Inject sessionStorage BEFORE the export page loads
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

    // Load export route
    await page.goto(`${baseUrl}/export/executive?print=1`, {
      waitUntil: ["domcontentloaded", "networkidle0"],
    });

    // Wait for layout + charts
    await page.waitForSelector(".exec-print-root", { timeout: 60_000 });
    await page.waitForSelector(".exec-print-charts .recharts-surface", {
      timeout: 60_000,
    });

    // settle fonts + final paint
    await page
      .waitForFunction(
        () => {
          // document.fonts is supported in modern Chromium; if missing, don't block.
          const d = document as unknown as { fonts?: { status?: string } };
          return d.fonts?.status === "loaded" || !d.fonts;
        },
        { timeout: 30_000 }
      )
      .catch(() => {});
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

    const filename = `executive-summary-${new Date()
      .toISOString()
      .slice(0, 10)}.pdf`;

    return new NextResponse(pdf, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e: unknown) {
    return new NextResponse(getErrorMessage(e), { status: 500 });
  }
}
