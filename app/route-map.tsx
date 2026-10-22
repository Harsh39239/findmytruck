"use client";

import { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { cumulative, positionAt } from "@/lib/geo";
import { routeProgress } from "@/lib/rules";
import type { Event, RouteInfo } from "@/lib/store";
import { Icon, duration } from "./ui";

// Top-down lorry facing "up"; it is turned to face the way it travels. The headlight beam and the
// bobbing only show while it is moving.
const LORRY = `
<div class="truck-rot"><div class="truck-bob">
<svg viewBox="0 0 40 64" width="40" height="64" aria-hidden="true">
  <defs>
    <linearGradient id="beam" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#fde68a" stop-opacity=".75"/><stop offset="1" stop-color="#fde68a" stop-opacity="0"/></linearGradient>
  </defs>
  <path class="beam" d="M12 12 L2 -14 L38 -14 L28 12 Z" fill="url(#beam)"/>
  <ellipse class="halo" cx="20" cy="36" rx="17" ry="27" fill="rgba(31,94,255,.18)"/>
  <rect x="5" y="9" width="4" height="8" rx="1.5" fill="#0f172a"/><rect x="31" y="9" width="4" height="8" rx="1.5" fill="#0f172a"/>
  <rect x="5" y="44" width="4" height="9" rx="1.5" fill="#0f172a"/><rect x="31" y="44" width="4" height="9" rx="1.5" fill="#0f172a"/>
  <rect x="5" y="36" width="4" height="8" rx="1.5" fill="#0f172a"/><rect x="31" y="36" width="4" height="8" rx="1.5" fill="#0f172a"/>
  <rect x="7" y="24" width="26" height="36" rx="3" fill="#ffffff" stroke="#1f5eff" stroke-width="2.4"/>
  <rect x="11" y="29" width="18" height="3" rx="1.5" fill="#1f5eff" opacity=".28"/><rect x="11" y="36" width="18" height="3" rx="1.5" fill="#1f5eff" opacity=".28"/><rect x="11" y="43" width="18" height="3" rx="1.5" fill="#1f5eff" opacity=".28"/>
  <rect x="14" y="50" width="12" height="6" rx="2" fill="#1f5eff"/>
  <rect x="9" y="6" width="22" height="19" rx="5" fill="#1f5eff"/>
  <rect x="9" y="6" width="22" height="7" rx="3.5" fill="#0b3bbf"/>
  <rect x="11.5" y="14" width="17" height="6.5" rx="2" fill="#dbe8ff"/>
  <rect x="2" y="13" width="4" height="3" rx="1" fill="#0f172a"/><rect x="34" y="13" width="4" height="3" rx="1" fill="#0f172a"/>
  <circle cx="13" cy="7.5" r="1.8" fill="#fde68a"/><circle cx="27" cy="7.5" r="1.8" fill="#fde68a"/>
</svg></div></div>`;

const pin = (letter: string, cls: string, label: string) =>
  L.divIcon({
    className: "",
    html: `<div class="pin ${cls}">${letter}</div><span class="pinlabel">${label.replace(/[<>&"]/g, "")}</span>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });

export default function RouteMap({ route, events, speed }: { route: RouteInfo; events: Event[]; speed: number }) {
  const holder = useRef<HTMLDivElement>(null);
  const live = useRef({ events, speed });
  useEffect(() => { live.current = { events, speed }; });

  const fitRef = useRef<() => void>(() => {});
  const followRef = useRef(false);
  const [follow, setFollow] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => { followRef.current = follow; }, [follow]);

  useEffect(() => {
    if (!holder.current) return;
    const dark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const map = L.map(holder.current, { zoomControl: false, scrollWheelZoom: false });
    // Plain OpenStreetMap tiles (free, no key). In dark mode the CSS inverts them.
    holder.current.classList.toggle("dark-tiles", dark);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "© OpenStreetMap contributors" }).addTo(map);
    L.control.zoom({ position: "bottomright" }).addTo(map);

    const pts = route.points;
    const cum = cumulative(pts);
    // The road: white edge, dotted grey for what is still ahead, glowing blue for what is done.
    const edge = L.polyline(pts, { color: "#ffffff", weight: 12, opacity: 0.95, lineCap: "round", lineJoin: "round" }).addTo(map);
    L.polyline(pts, { color: "#7b8bb2", weight: 6, opacity: 0.9, dashArray: "1 11", lineCap: "round", lineJoin: "round" }).addTo(map);
    const glow = L.polyline([pts[0]], { color: "#1f5eff", weight: 16, opacity: 0.22, lineCap: "round" }).addTo(map);
    const trail = L.polyline([pts[0]], { color: "#1f5eff", weight: 7, lineCap: "round", lineJoin: "round" }).addTo(map);
    L.marker(pts[0], { icon: pin("A", "pin-a", route.from), interactive: false, zIndexOffset: 500 }).addTo(map);
    L.marker(pts[pts.length - 1], { icon: pin("B", "pin-b", route.to), interactive: false, zIndexOffset: 500 }).addTo(map);
    const lorry = L.marker(pts[0], {
      icon: L.divIcon({ className: "truck-wrap", html: LORRY, iconSize: [40, 64], iconAnchor: [20, 32] }),
      interactive: false,
      zIndexOffset: 1000,
    }).addTo(map);

    const fit = () => map.fitBounds(edge.getBounds(), { padding: [44, 44] });
    fitRef.current = fit;
    fit();
    setTimeout(() => map.invalidateSize(), 0);
    map.on("dragstart", () => setFollow(false)); // moving the map by hand switches "follow" off

    let raf = 0;
    let last = -1;
    let lastShown = 0;
    let wasFollowing = false;
    const frame = (t: number) => {
      const { events: evs, speed: sp } = live.current;
      const p = routeProgress(evs, route.durationMin, sp, Date.now());
      if (last < 0 || Math.abs(p - last) > 0.0002) {
        const { pos, heading, index } = positionAt(pts, cum, p);
        lorry.setLatLng(pos);
        const el = lorry.getElement();
        const rot = el?.querySelector<HTMLElement>(".truck-rot");
        if (rot) rot.style.transform = `rotate(${heading}deg)`;
        el?.classList.toggle("moving", p > 0 && p < 1);
        const done = [...pts.slice(0, index), pos];
        trail.setLatLngs(done);
        glow.setLatLngs(done);
        if (followRef.current) {
          if (!wasFollowing) map.setView(pos, Math.max(map.getZoom(), 11), { animate: true });
          else map.panTo(pos, { animate: false });
        }
        wasFollowing = followRef.current;
        last = p;
      }
      if (t - lastShown > 250) { setProgress(p); lastShown = t; }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => { cancelAnimationFrame(raf); map.remove(); };
  }, [route]);

  const pct = Math.round(progress * 100);
  const kmLeft = Math.round((1 - progress) * route.distanceKm);
  const state = progress >= 1 ? "Arrived" : progress > 0 ? "On the road" : "At pickup";

  return (
    <div className="mapwrap">
      <div ref={holder} className="map" />
      <div className="mapctl">
        <button type="button" className={follow ? "on" : ""} onClick={() => setFollow((f) => !f)} aria-pressed={follow}>
          <Icon name="locate" size={15} /> Follow lorry
        </button>
        <button type="button" onClick={() => { setFollow(false); fitRef.current(); }}>
          <Icon name="expand" size={15} /> Whole route
        </button>
      </div>
      <div className="mapstats">
        <b>{state}</b>
        <span>
          {progress >= 1
            ? `${route.distanceKm} km done`
            : `${pct}% done, ${kmLeft} km to go${speed === 1 && progress > 0 ? `, about ${duration(Math.round((1 - progress) * route.durationMin))}` : ""}`}
        </span>
      </div>
    </div>
  );
}
