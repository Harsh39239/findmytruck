"use client";

import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { cumulative, positionAt } from "@/lib/geo";
import { routeProgress } from "@/lib/rules";
import type { Event, RouteInfo } from "@/lib/store";

// Top-down lorry that points "up" and is turned to face the direction of travel.
const LORRY = `
<div class="truck-rot"><div class="truck-bob">
<svg viewBox="0 0 28 52" width="34" height="52" aria-hidden="true">
  <ellipse class="halo" cx="14" cy="28" rx="13" ry="22" fill="rgba(31,94,255,.18)"/>
  <rect x="2.5" y="8" width="3" height="7" rx="1" fill="#111"/><rect x="22.5" y="8" width="3" height="7" rx="1" fill="#111"/>
  <rect x="2.5" y="35" width="3" height="8" rx="1" fill="#111"/><rect x="22.5" y="35" width="3" height="8" rx="1" fill="#111"/>
  <rect x="5" y="20" width="18" height="29" rx="2.5" fill="#fff" stroke="#1f5eff" stroke-width="2"/>
  <rect x="8" y="26" width="12" height="2" fill="#1f5eff" opacity=".35"/><rect x="8" y="32" width="12" height="2" fill="#1f5eff" opacity=".35"/><rect x="8" y="38" width="12" height="2" fill="#1f5eff" opacity=".35"/>
  <rect x="6" y="3" width="16" height="16" rx="4" fill="#1f5eff"/>
  <rect x="8.5" y="5.5" width="11" height="5" rx="1.5" fill="#d6e4ff"/>
</svg></div></div>`;

const pin = (letter: string, cls: string) =>
  L.divIcon({ className: "", html: `<div class="pin ${cls}">${letter}</div>`, iconSize: [28, 28], iconAnchor: [14, 14] });

export default function RouteMap({ route, events, speed }: { route: RouteInfo; events: Event[]; speed: number }) {
  const holder = useRef<HTMLDivElement>(null);
  const live = useRef({ events, speed });
  useEffect(() => { live.current = { events, speed }; });

  useEffect(() => {
    if (!holder.current) return;
    const dark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const map = L.map(holder.current, { zoomControl: false, scrollWheelZoom: false });
    // Plain OpenStreetMap tiles (free, no key). In dark mode the CSS inverts them.
    holder.current.classList.toggle("dark-tiles", dark);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "© OpenStreetMap contributors",
    }).addTo(map);
    L.control.zoom({ position: "bottomright" }).addTo(map);

    const pts = route.points;
    const cum = cumulative(pts);
    const road = L.polyline(pts, { color: "#8a97b5", weight: 8, opacity: 0.85, lineCap: "round" }).addTo(map);
    const trail = L.polyline([pts[0]], { color: "#1f5eff", weight: 8, lineCap: "round" }).addTo(map);
    L.marker(pts[0], { icon: pin("A", "pin-a"), interactive: false }).addTo(map);
    L.marker(pts[pts.length - 1], { icon: pin("B", "pin-b"), interactive: false }).addTo(map);
    const lorry = L.marker(pts[0], {
      icon: L.divIcon({ className: "truck-wrap", html: LORRY, iconSize: [34, 52], iconAnchor: [17, 26] }),
      interactive: false,
      zIndexOffset: 1000,
    }).addTo(map);

    map.fitBounds(road.getBounds(), { padding: [32, 32] });
    setTimeout(() => map.invalidateSize(), 0);

    let raf = 0;
    let last = -1;
    const frame = () => {
      const { events: evs, speed: sp } = live.current;
      const p = routeProgress(evs, route.durationMin, sp, Date.now());
      if (last < 0 || Math.abs(p - last) > 0.0003) {
        const { pos, heading, index } = positionAt(pts, cum, p);
        lorry.setLatLng(pos);
        const el = lorry.getElement();
        const rot = el?.querySelector<HTMLElement>(".truck-rot");
        if (rot) rot.style.transform = `rotate(${heading}deg)`;
        el?.classList.toggle("moving", p > 0 && p < 1);
        trail.setLatLngs([...pts.slice(0, index), pos]);
        last = p;
      }
      raf = requestAnimationFrame(frame);
    };
    frame();
    return () => { cancelAnimationFrame(raf); map.remove(); };
  }, [route]);

  return <div ref={holder} className="map" />;
}
