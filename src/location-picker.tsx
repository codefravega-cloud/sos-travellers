import type { CircleMarker, Map as LeafletMap } from "leaflet";
import { useEffect, useRef } from "react";

type Point = { lat: number; lng: number };

// Where a company is: tapping the map sets its point. Leaflet stays out of the main bundle, like the site's map.
export default function LocationPicker({ point, center, onChange }: { point?: Point; center?: [number, number]; onChange: (point?: Point) => void }) {
  const node = useRef<HTMLDivElement>(null);
  const map = useRef<LeafletMap | null>(null);
  const marker = useRef<CircleMarker | null>(null);
  const change = useRef(onChange);
  const first = useRef({ point, center });
  useEffect(() => { change.current = onChange; });

  useEffect(() => {
    let alive = true;
    void import("leaflet").then(({ default: L }) => {
      if (!alive || !node.current || map.current) return;
      const start = first.current.point;
      const leaflet = L.map(node.current).setView(start ? [start.lat, start.lng] : first.current.center ?? [-33.45, -70.66], start ? 15 : 11);
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "© OpenStreetMap" }).addTo(leaflet);
      const place = (lat: number, lng: number) => {
        if (marker.current) marker.current.setLatLng([lat, lng]);
        else marker.current = L.circleMarker([lat, lng], { radius: 9, color: "#fff", weight: 3, fillColor: "#e4572e", fillOpacity: 1 }).addTo(leaflet);
      };
      if (start) place(start.lat, start.lng);
      leaflet.on("click", (event) => { place(event.latlng.lat, event.latlng.lng); change.current({ lat: event.latlng.lat, lng: event.latlng.lng }); });
      map.current = leaflet;
    });
    return () => { alive = false; map.current?.remove(); map.current = null; marker.current = null; };
  }, []);

  return <div className="panel-map-field">
    <div ref={node} className="panel-map" role="application" aria-label="Mapa para marcar la ubicación"/>
    <div className="team-actions">
      <span className="team-empty">{point?`Punto marcado: ${point.lat.toFixed(5)}, ${point.lng.toFixed(5)}`:"Toca el mapa para marcar la ubicación."}</span>
      {point&&<button type="button" className="team-quiet" onClick={()=>{marker.current?.remove();marker.current=null;change.current(undefined)}}>Quitar punto</button>}
    </div>
  </div>;
}
