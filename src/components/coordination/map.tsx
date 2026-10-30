"use client";

import { useMemo, useState } from "react";
import { format, type Locale } from "@/lib/i18n";
import type { Dictionary } from "@/messages/en";
import { districtCentroid, type Point } from "@/lib/geo";
import { DISTRICT_BY_CODE } from "@/data/geography";
import { MOCK_CANDIDATES } from "@/lib/coordination/candidates";
import type { CoordinationRequest, MockCandidate } from "@/lib/coordination/types";
import { Badge, Callout, type BadgeTone } from "@/components/ui/ui";

type PinKind = "facility" | "committed" | "invited" | "candidate";

type Pin = {
  id: string;
  kind: PinKind;
  label: string;
  sublabel: string;
  point: Point;
};

const PIN_TONE: Record<PinKind, BadgeTone> = {
  facility: "brand",
  committed: "teal",
  invited: "amber",
  candidate: "neutral",
};

const PIN_STYLE: Record<PinKind, { className: string; mark: string }> = {
  facility: { className: "bg-brand-600 text-white border-brand-700", mark: "H" },
  committed: { className: "bg-teal-700 text-white border-teal-800", mark: "✓" },
  invited: { className: "bg-amber-700 text-white border-amber-800", mark: "…" },
  candidate: { className: "bg-surface text-ink-soft border-line-strong", mark: "•" },
};

function candidateById(id: string): MockCandidate | undefined {
  return MOCK_CANDIDATES.find((candidate) => candidate.id === id);
}

function districtPoint(code: string): Point | null {
  return districtCentroid(code);
}

function displayName(districtCode: string, locale: Locale): string {
  const district = DISTRICT_BY_CODE.get(districtCode);
  if (!district) return districtCode;
  return locale === "ne" ? district.nameNe : district.nameEn;
}

/**
 * District-level coordination map with an equivalent list view.
 *
 * Every pin is placed on its district headquarters — never a home address —
 * and the screen states that no live donor tracking is shown.
 */
export function CoordinationMap({
  dict,
  locale,
  request,
  candidates,
}: {
  dict: Dictionary;
  locale: Locale;
  request: CoordinationRequest;
  candidates: readonly MockCandidate[];
}) {
  const [view, setView] = useState<"map" | "list">("map");
  const [selected, setSelected] = useState<string | null>(null);

  const pins = useMemo<Pin[]>(() => {
    const facilityPoint: Point | null =
      request.hospitalLat && request.hospitalLng
        ? { latitude: request.hospitalLat, longitude: request.hospitalLng }
        : districtPoint(request.districtCode);

    const rows: Pin[] = [];
    if (facilityPoint) {
      rows.push({
        id: "facility",
        kind: "facility",
        label: request.hospital,
        sublabel: displayName(request.districtCode, locale),
        point: facilityPoint,
      });
    }

    for (const participant of request.participants) {
      const candidate = candidateById(participant.donorId);
      const point = candidate ? districtPoint(candidate.districtCode) : null;
      if (!candidate || !point) continue;
      const kind: PinKind =
        participant.state === "invited"
          ? "invited"
          : participant.state === "declined" || participant.state === "withdrawn"
            ? "candidate"
            : "committed";
      rows.push({
        id: participant.id,
        kind,
        label: candidate.name,
        sublabel: `${participant.donorBloodGroup} · ${format(dict.coord.candidates.distance, {
          km: participant.distanceKm ?? candidate.distanceKm,
        })}`,
        point,
      });
    }

    const involved = new Set(request.participants.map((participant) => participant.donorId));
    for (const candidate of candidates) {
      if (involved.has(candidate.id)) continue;
      const point = districtPoint(candidate.districtCode);
      if (!point) continue;
      rows.push({
        id: candidate.id,
        kind: "candidate",
        label: candidate.name,
        sublabel: `${candidate.bloodGroup} · ${format(dict.coord.candidates.distance, {
          km: candidate.distanceKm,
        })}`,
        point,
      });
    }

    return rows;
  }, [candidates, dict, locale, request]);

  const bounds = useMemo(() => {
    const lats = pins.map((pin) => pin.point.latitude);
    const lngs = pins.map((pin) => pin.point.longitude);
    if (lats.length === 0) return null;
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    const latPad = Math.max((maxLat - minLat) * 0.15, 0.05);
    const lngPad = Math.max((maxLng - minLng) * 0.15, 0.05);
    return { minLat: minLat - latPad, maxLat: maxLat + latPad, minLng: minLng - lngPad, maxLng: maxLng + lngPad };
  }, [pins]);

  const position = (pin: Pin) => {
    if (!bounds) return { left: "50%", top: "50%" };
    const spanLng = Math.max(bounds.maxLng - bounds.minLng, 1e-6);
    const spanLat = Math.max(bounds.maxLat - bounds.minLat, 1e-6);
    const left = ((pin.point.longitude - bounds.minLng) / spanLng) * 100;
    const top = ((bounds.maxLat - pin.point.latitude) / spanLat) * 100;
    return { left: `${Math.min(96, Math.max(4, left))}%`, top: `${Math.min(96, Math.max(4, top))}%` };
  };

  const activePin = pins.find((pin) => pin.id === selected) ?? null;

  return (
    <section className="card p-4" aria-labelledby="map-title">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 id="map-title" className="text-base font-semibold">
          {dict.coord.map.title}
        </h3>
        <div
          className="flex rounded-lg border border-line p-1"
          role="group"
          aria-label={dict.coord.map.viewLabel}
        >
          <button
            type="button"
            aria-pressed={view === "map"}
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${
              view === "map" ? "bg-brand-600 text-white" : "text-muted hover:text-ink"
            }`}
            onClick={() => setView("map")}
          >
            {dict.coord.map.showMap}
          </button>
          <button
            type="button"
            aria-pressed={view === "list"}
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${
              view === "list" ? "bg-brand-600 text-white" : "text-muted hover:text-ink"
            }`}
            onClick={() => setView("list")}
          >
            {dict.coord.map.showList}
          </button>
        </div>
      </div>

      {view === "map" ? (
        <div
          className="relative mt-3 aspect-[4/3] w-full overflow-hidden rounded-xl border border-line bg-surface-muted"
          style={{
            backgroundImage:
              "repeating-linear-gradient(0deg, transparent 0 39px, rgba(220,201,191,0.5) 39px 40px), repeating-linear-gradient(90deg, transparent 0 39px, rgba(220,201,191,0.5) 39px 40px)",
          }}
        >
          <p className="sr-only">{dict.coord.map.disclaimer}</p>
          {pins.map((pin) => {
            const style = PIN_STYLE[pin.kind];
            const isActive = selected === pin.id;
            return (
              <button
                key={pin.id}
                type="button"
                aria-pressed={isActive}
                aria-label={`${pin.label} — ${pin.sublabel}`}
                onClick={() => setSelected(isActive ? null : pin.id)}
                style={position(pin)}
                className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 shadow-sm ${style.className} ${
                  isActive ? "ring-2 ring-brand-600 ring-offset-2" : ""
                } h-7 w-7 text-xs font-bold leading-none`}
              >
                <span aria-hidden="true">{style.mark}</span>
              </button>
            );
          })}
        </div>
      ) : (
        <ul className="mt-3 grid gap-2">
          {pins.map((pin) => (
            <li key={pin.id}>
              <button
                type="button"
                className={`flex w-full items-center justify-between gap-3 rounded-xl border px-3 py-2.5 text-left text-sm ${
                  selected === pin.id
                    ? "border-brand-600 bg-brand-50"
                    : "border-line bg-surface hover:bg-surface-muted"
                }`}
                aria-pressed={selected === pin.id}
                onClick={() => setSelected(selected === pin.id ? null : pin.id)}
              >
                <span className="min-w-0">
                  <span className="block truncate font-medium">{pin.label}</span>
                  <span className="block truncate text-xs text-muted">{pin.sublabel}</span>
                </span>
                <Badge tone={PIN_TONE[pin.kind]}>
                  {pin.kind === "facility"
                    ? dict.coord.map.hospital
                    : pin.kind === "committed"
                      ? dict.coord.map.committed
                      : pin.kind === "invited"
                        ? dict.coord.map.invited
                        : dict.coord.map.donor}
                </Badge>
              </button>
            </li>
          ))}
          {pins.length === 0 ? (
            <li className="text-sm text-muted">{dict.coord.map.empty}</li>
          ) : null}
        </ul>
      )}

      {activePin ? (
        <p className="mt-3 text-sm text-ink-soft" role="status">
          {format(dict.coord.map.selected, { name: activePin.label })} — {activePin.sublabel}
        </p>
      ) : null}

      <ul className="mt-3 flex flex-wrap gap-3 text-xs text-muted">
        <li>{dict.coord.map.legend}:</li>
        <li>{dict.coord.map.hospital}</li>
        <li>{dict.coord.map.committed}</li>
        <li>{dict.coord.map.invited}</li>
        <li>{dict.coord.map.donor}</li>
      </ul>

      <div className="mt-3">
        <Callout tone="neutral">
          <p>{dict.coord.map.disclaimer}</p>
          <p className="mt-1">{dict.coord.map.distanceNote}</p>
        </Callout>
      </div>
    </section>
  );
}
