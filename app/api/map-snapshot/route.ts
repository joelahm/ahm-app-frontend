import { NextRequest, NextResponse } from "next/server";
import { chromium } from "playwright";

type SnapshotRequestPayload = {
  center: {
    latitude: number;
    longitude: number;
  } | null;
  height?: number;
  label?: string | null;
  points?: Array<{
    latitude: number;
    longitude: number;
    rank?: number | null;
  }>;
  width?: number;
};

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const asFiniteNumber = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

const encodePayload = (payload: SnapshotRequestPayload) =>
  Buffer.from(encodeURIComponent(JSON.stringify(payload)), "utf-8").toString(
    "base64url",
  );

export async function POST(request: NextRequest) {
  let browser: Awaited<ReturnType<typeof chromium.launch>> | null = null;

  try {
    process.env.PLAYWRIGHT_BROWSERS_PATH = "0";

    const body = (await request.json()) as SnapshotRequestPayload;
    const centerLatitude = asFiniteNumber(body?.center?.latitude);
    const centerLongitude = asFiniteNumber(body?.center?.longitude);

    if (centerLatitude === null || centerLongitude === null) {
      return NextResponse.json(
        { message: "Valid map center is required." },
        { status: 400 },
      );
    }

    const width =
      asFiniteNumber(body.width) === null
        ? 960
        : clamp(Math.round(body.width as number), 320, 1400);
    const height =
      asFiniteNumber(body.height) === null
        ? 540
        : clamp(Math.round(body.height as number), 220, 1000);
    const points = (Array.isArray(body.points) ? body.points : [])
      .map((point) => {
        const latitude = asFiniteNumber(point?.latitude);
        const longitude = asFiniteNumber(point?.longitude);
        const rank = asFiniteNumber(point?.rank);

        if (latitude === null || longitude === null) {
          return null;
        }

        return {
          latitude,
          longitude,
          rank,
        };
      })
      .filter(
        (
          point,
        ): point is {
          latitude: number;
          longitude: number;
          rank: number | null;
        } => Boolean(point),
      );
    const payload: SnapshotRequestPayload = {
      center: {
        latitude: centerLatitude,
        longitude: centerLongitude,
      },
      height,
      label: typeof body.label === "string" ? body.label : null,
      points,
      width,
    };
    const snapshotUrl = `${request.nextUrl.origin}/map-snapshot?payload=${encodeURIComponent(encodePayload(payload))}`;

    browser = await chromium.launch({
      args: ["--disable-web-security", "--no-sandbox"],
      headless: true,
    });

    const page = await browser.newPage({
      viewport: {
        height: height + 64,
        width: width + 64,
      },
    });

    await page.goto(snapshotUrl, {
      timeout: 20000,
      waitUntil: "networkidle",
    });
    await page.waitForSelector("[data-map-ready='true']", {
      state: "attached",
      timeout: 20000,
    });
    // Let map tiles/markers finish painting for a stable screenshot.
    await page.waitForTimeout(1200);

    const captureElement = page.locator(".snapshot-map-capture").first();
    const screenshot = await captureElement.screenshot({
      type: "png",
    });

    return NextResponse.json({
      dataUrl: `data:image/png;base64,${screenshot.toString("base64")}`,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to capture map snapshot.";

    return NextResponse.json({ message }, { status: 500 });
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}
