"use client";

import type { Dictionary } from "@/messages/en";
import { updateCoordination, useCoordination } from "@/lib/coordination/store";
import { LocationAssist } from "./location";

/**
 * The very first thing the site asks for.
 *
 * On a first visit the browser prompt is offered immediately — *Use device
 * location* grants it right there, *Enter it myself* defers it and leaves every
 * manual field available. Once answered the card removes itself and the
 * emergency panel takes over showing the resulting state (with a retry), so the
 * choice is never asked for twice on one page.
 *
 * A granted fix is reduced to a district by `LocationAssist` and stored in the
 * coordination store, which the emergency panel then reads — so the tap at the
 * top of the page is the only geolocation request the user has to make.
 */
export function EntryLocationCard({ dict }: { dict: Dictionary }) {
  const { locationPermission } = useCoordination();

  if (locationPermission !== "unknown") return null;

  return (
    <div className="container-page pt-5">
      <LocationAssist
        dict={dict}
        onPick={(picked) =>
          updateCoordination({
            location: {
              provinceCode: picked.provinceCode,
              districtCode: picked.districtCode,
              municipality: "",
              area: picked.area,
              hospital: "",
              lat: null,
              lng: null,
              source: picked.source,
            },
          })
        }
      />
    </div>
  );
}
