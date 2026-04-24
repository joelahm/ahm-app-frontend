"use client";

import { useEffect, useMemo, useState } from "react";

import { ScanCoverageMiniMap } from "@/components/dashboard/client-details/scan-coverage-mini-map";

type ReportPoint = {
  label: string;
  latitude: number;
  longitude: number;
  rank?: number | null;
};

type ReportMap = {
  averageRank: string;
  center: {
    latitude: number;
    longitude: number;
  } | null;
  label?: string | null;
  points: ReportPoint[];
  subtitle?: string | null;
  title: string;
};

type ReportCompetitorRow = {
  businessName: string;
  change: string;
  domain: string;
  gridSize: string;
  latestRank: string;
  previousRank: string;
  reviews: string;
};

type ReportPayload = {
  competitorRows: ReportCompetitorRow[];
  gridLayout: 1 | 2;
  keywordLabel: string;
  latestRankHeader: string;
  maps: ReportMap[];
  previousRankHeader: string;
  reportTitle: string;
};

const decodeBase64UrlPayload = (value: string) => {
  const normalized = value.replaceAll("-", "+").replaceAll("_", "/");
  const padded =
    normalized + "=".repeat((4 - (normalized.length % 4 || 4)) % 4);
  const decodedText = atob(padded);

  return decodeURIComponent(
    Array.from(decodedText)
      .map((character) =>
        `%${character.charCodeAt(0).toString(16).padStart(2, "0")}`,
      )
      .join(""),
  );
};

const ReportMapPanel = ({
  mapIndex,
  map,
  onReady,
}: {
  mapIndex: number;
  map: ReportMap;
  onReady: () => void;
}) => {
  useEffect(() => {
    if (!map.center) {
      onReady();
    }
  }, [map.center, onReady]);

  return (
    <article className="report-map-card">
      {map.center ? (
        <ScanCoverageMiniMap
          center={map.center}
          height={360}
          label={map.label || `Map ${mapIndex + 1}`}
          points={map.points}
          onMapReady={onReady}
        />
      ) : (
        <div className="report-map-placeholder">Map unavailable</div>
      )}
      <div className="report-map-meta">
        <h3>{map.title}</h3>
        <p>{map.subtitle || ""}</p>
        <strong>Avg. Rank: {map.averageRank}</strong>
      </div>
    </article>
  );
};

export default function PrintScanReportPage() {
  const payload = useMemo<ReportPayload | null>(() => {
    if (typeof window === "undefined") {
      return null;
    }

    try {
      const params = new URLSearchParams(window.location.search);
      const storageKey = params.get("storageKey");
      const encodedPayload = params.get("payload");

      if (storageKey) {
        const stored = window.localStorage.getItem(storageKey);

        if (!stored) {
          return null;
        }

        return JSON.parse(stored) as ReportPayload;
      }

      if (!encodedPayload) {
        return null;
      }

      return JSON.parse(decodeBase64UrlPayload(encodedPayload)) as ReportPayload;
    } catch {
      return null;
    }
  }, []);
  const [readyMapKeys, setReadyMapKeys] = useState<Record<string, true>>({});

  const maps = payload?.maps || [];
  const allMapsReady = maps.every((_, mapIndex) => readyMapKeys[String(mapIndex)]);

  useEffect(() => {
    document.documentElement.setAttribute(
      "data-report-ready",
      payload && allMapsReady ? "true" : "false",
    );

    return () => {
      document.documentElement.removeAttribute("data-report-ready");
    };
  }, [allMapsReady, payload]);

  if (!payload) {
    return (
      <main className="report-root">
        <section className="report-page">
          <h1>Invalid report payload.</h1>
        </section>
      </main>
    );
  }

  return (
    <main className="report-root">
      <section className="report-page">
        <h1 className="report-title">{payload.reportTitle}</h1>
        <p className="report-subtitle">
          Keyword: {payload.keywordLabel || "-"} | Grid View: {payload.gridLayout}{" "}
          column(s)
        </p>

        <h2 className="report-section-title">Map Panels</h2>
        <div
          className="report-map-grid"
          style={{
            gridTemplateColumns: payload.gridLayout === 2 ? "1fr 1fr" : "1fr",
          }}
        >
          {maps.length ? (
            maps.map((map, mapIndex) => (
              <ReportMapPanel
                key={`${map.title}-${mapIndex}`}
                mapIndex={mapIndex}
                map={map}
                onReady={() => {
                  setReadyMapKeys((previous) => ({
                    ...previous,
                    [String(mapIndex)]: true,
                  }));
                }}
              />
            ))
          ) : (
            <p className="report-empty">No map data available.</p>
          )}
        </div>
      </section>

      <section className="report-page report-page-break">
        <h2 className="report-section-title">Competitor Analysis</h2>
        <table className="report-table">
          <thead>
            <tr>
              <th>Business Name</th>
              <th>Domain</th>
              <th>{payload.previousRankHeader}</th>
              <th>{payload.latestRankHeader}</th>
              <th>Change</th>
              <th>Grid Size</th>
              <th>Reviews</th>
            </tr>
          </thead>
          <tbody>
            {payload.competitorRows.length ? (
              payload.competitorRows.map((row, index) => (
                <tr key={`${row.businessName}-${index}`}>
                  <td>{row.businessName}</td>
                  <td>{row.domain}</td>
                  <td>{row.previousRank}</td>
                  <td>{row.latestRank}</td>
                  <td>{row.change}</td>
                  <td>{row.gridSize}</td>
                  <td>{row.reviews}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7}>No competitor data available.</td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      <style jsx global>{`
        @page {
          size: A4;
          margin: 10mm;
        }
        html,
        body {
          background: #f5f6f8;
          margin: 0;
          padding: 0;
        }
        .report-root {
          margin: 0 auto;
          max-width: 210mm;
          padding: 10mm 0;
        }
        .report-page {
          background: #fff;
          box-sizing: border-box;
          min-height: calc(297mm - 20mm);
          padding: 0;
        }
        .report-title {
          color: #111827;
          font-size: 28px;
          margin: 0 0 8px;
        }
        .report-subtitle {
          color: #6b7280;
          font-size: 14px;
          margin: 0 0 14px;
        }
        .report-section-title {
          color: #111827;
          font-size: 24px;
          margin: 0 0 10px;
        }
        .report-map-grid {
          display: grid;
          gap: 12px;
        }
        .report-map-card {
          background: #fff;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          overflow: hidden;
        }
        .report-map-placeholder {
          align-items: center;
          background: #f3f4f6;
          color: #6b7280;
          display: grid;
          font-size: 12px;
          height: 360px;
          width: 100%;
        }
        .report-map-meta {
          padding: 10px 12px 14px;
        }
        .report-map-meta h3 {
          font-size: 14px;
          margin: 0;
        }
        .report-map-meta p {
          color: #6b7280;
          font-size: 12px;
          margin: 4px 0 8px;
        }
        .report-empty {
          color: #6b7280;
          font-size: 12px;
        }
        .report-page-break {
          break-before: page;
          page-break-before: always;
        }
        .report-table {
          border-collapse: collapse;
          font-size: 12px;
          width: 100%;
        }
        .report-table th,
        .report-table td {
          border: 1px solid #e5e7eb;
          padding: 8px;
          text-align: left;
          vertical-align: top;
        }
        .report-table th {
          background: #f9fafb;
          font-weight: 600;
        }
      `}</style>
    </main>
  );
}
