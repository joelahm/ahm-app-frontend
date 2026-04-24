import { NextRequest, NextResponse } from "next/server";
import { chromium } from "playwright";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const encodePayload = (payload: unknown) =>
  Buffer.from(encodeURIComponent(JSON.stringify(payload)), "utf-8").toString(
    "base64url",
  );

export async function POST(request: NextRequest) {
  let browser: Awaited<ReturnType<typeof chromium.launch>> | null = null;

  try {
    process.env.PLAYWRIGHT_BROWSERS_PATH = "0";

    const payload = (await request.json()) as Record<string, unknown>;
    const reportTitle =
      typeof payload.reportTitle === "string" && payload.reportTitle.trim()
        ? payload.reportTitle.trim()
        : "Scan Report";
    const pageUrl = `${request.nextUrl.origin}/print/scan-report?payload=${encodeURIComponent(encodePayload(payload))}`;

    browser = await chromium.launch({
      args: ["--disable-web-security", "--no-sandbox"],
      headless: true,
    });

    const page = await browser.newPage({
      viewport: {
        height: 1600,
        width: 1200,
      },
    });

    await page.goto(pageUrl, {
      timeout: 35000,
      waitUntil: "networkidle",
    });
    await page.waitForSelector("html[data-report-ready='true']", {
      state: "attached",
      timeout: 35000,
    });
    await page.waitForTimeout(1000);

    const pdfBuffer = await page.pdf({
      format: "A4",
      margin: {
        bottom: "10mm",
        left: "10mm",
        right: "10mm",
        top: "10mm",
      },
      printBackground: true,
    });

    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Disposition": `attachment; filename="${reportTitle
          .replace(/[^a-z0-9-_]+/gi, "-")
          .replace(/-+/g, "-")
          .toLowerCase()}.pdf"`,
        "Content-Type": "application/pdf",
      },
      status: 200,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to export scan report.";

    return NextResponse.json(
      {
        message,
      },
      { status: 500 },
    );
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}
