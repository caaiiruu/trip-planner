import { useState, useEffect, useRef } from "react";

// ─── Mock Data ──────────────────────────────────────────────────────────────
const MOCK_TRIPS = [
  {
    id: "trip-1",
    name: "東京五日遊",
    coverEmoji: "🗼",
    dateRange: "2025-08-10 ~ 2025-08-14",
    owner: "Shulin",
    members: [
      { id: "m1", name: "Shulin", role: "owner", permission: "admin" },
      { id: "m2", name: "小明", role: "editor", permission: "edit" },
      { id: "m3", name: "Momo", role: "viewer", permission: "view" },
    ],
    places: [
      {
        id: "p1", name: "淺草寺", category: "attraction",
        lat: 35.7148, lng: 139.7967,
        address: "東京都台東區淺草2丁目3−1",
        mapUrl: "https://maps.google.com/?q=浅草寺,東京",
        note: "一定要早點去，人潮下午很多！建議七點前到", booked: false,
        openTime: "06:00", closeTime: "17:00",
        date: null, startTime: null, duration: 120, meetTime: null,
      },
      {
        id: "p2", name: "新宿御苑", category: "attraction",
        lat: 35.6851, lng: 139.7100,
        address: "東京都新宿區內藤町11",
        mapUrl: "https://maps.google.com/?q=新宿御苑",
        note: "早上去比較涼，記得帶外套，門票500円", booked: true,
        openTime: "09:00", closeTime: "16:30",
        date: "2025-08-11", startTime: "10:00", duration: 180, meetTime: "09:45",
      },
      {
        id: "p3", name: "東京國立博物館", category: "attraction",
        lat: 35.7188, lng: 139.7766,
        address: "東京都台東區上野公園13-9",
        mapUrl: "https://maps.google.com/?q=東京国立博物館",
        note: "需提前買票，特展門票另計，週一公休", booked: true,
        openTime: "09:30", closeTime: "17:00",
        date: "2025-08-11", startTime: "14:00", duration: 150, meetTime: "13:45",
      },
      {
        id: "p4", name: "Shinjuku Granbell Hotel", category: "accommodation",
        lat: 35.6918, lng: 139.7027,
        address: "東京都新宿區歌舞伎町1-19-14",
        mapUrl: "https://maps.google.com/?q=Shinjuku+Granbell+Hotel",
        note: "已訂！含早餐，check-in 15:00，停車場需預約", booked: true,
        checkIn: "15:00", checkOut: "11:00",
        date: "2025-08-11", stayNights: 2,
        startTime: null, duration: null, meetTime: null,
      },
      {
        id: "p5", name: "築地場外市場", category: "restaurant",
        lat: 35.6654, lng: 139.7707,
        address: "東京都中央區築地4丁目16−2",
        mapUrl: "https://maps.google.com/?q=築地場外市場",
        note: "早餐或午餐，壽司推薦壽司大，週日公休請注意", booked: false,
        date: "2025-08-12", startTime: "08:00", duration: 90, meetTime: "07:50",
      },
    ],
  },
];

const PERMISSIONS = {
  admin: { canEdit: true, canManageMembers: true, canDelete: true },
  edit: { canEdit: true, canManageMembers: false, canDelete: false },
  view: { canEdit: false, canManageMembers: false, canDelete: false },
};

function parseGoogleMapsUrl(url) {
  const patterns = [
    /maps\.google\.[^/]+\/maps\?.*q=([^&]+)/i,
    /google\.[^/]+\/maps\/place\/([^/@]+)/i,
    /goo\.gl\/maps\/([^?&]+)/i,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return decodeURIComponent(m[1].replace(/\+/g, " "));
  }
  return null;
}

function groupByDate(places) {
  const map = {};
  places.forEach(p => {
    if (p.date) {
      if (!map[p.date]) map[p.date] = [];
      map[p.date].push(p);
    }
  });
  Object.keys(map).forEach(d => {
    map[d].sort((a, b) => {
      const ta = a.checkIn || a.startTime || "99:99";
      const tb = b.checkIn || b.startTime || "99:99";
      return ta.localeCompare(tb);
    });
  });
  return map;
}

function formatDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("zh-TW", { month: "long", day: "numeric", weekday: "short" });
}

// ─── Badge ────────────────────────────────────────────────────────────────────
function Badge({ children, color = "blue" }) {
  const colors = {
    blue: "bg-sky-100 text-sky-700",
    green: "bg-emerald-100 text-emerald-700",
    orange: "bg-amber-100 text-amber-700",
    purple: "bg-violet-100 text-violet-700",
    gray: "bg-zinc-100 text-zinc-500",
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${colors[color]}`}>
      {children}
    </span>
  );
}

// ─── Avatar ───────────────────────────────────────────────────────────────────
function Avatar({ name, size = "sm" }) {
  const colors = ["bg-sky-400","bg-violet-400","bg-amber-400","bg-emerald-400","bg-rose-400"];
  const idx = name.charCodeAt(0) % colors.length;
  const sz = size === "lg" ? "w-10 h-10 text-sm" : "w-7 h-7 text-xs";
  return (
    <div className={`${sz} ${colors[idx]} rounded-full flex items-center justify-center text-white font-bold flex-shrink-0 border-2 border-white`}>
      {name[0]}
    </div>
  );
}

// ─── Modal (bottom-sheet on mobile) ──────────────────────────────────────────
function Modal({ open, onClose, title, children }) {
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end sm:justify-center sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-3xl shadow-2xl flex flex-col"
        style={{ maxHeight: "92vh" }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 bg-zinc-200 rounded-full" />
        </div>
        <div className="px-5 py-3 flex items-center justify-between border-b border-zinc-100">
          <h3 className="font-bold text-zinc-800 text-base">{title}</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-zinc-100 flex items-center justify-center text-zinc-400 text-lg">✕</button>
        </div>
        <div className="overflow-y-auto flex-1 p-5">{children}</div>
      </div>
    </div>
  );
}

// ─── Leaflet Map (OpenStreetMap, no API key) ──────────────────────────────────
function LeafletMap({ places, focusedId, onSelectPlace }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef({});
  const containerId = useRef("leaflet-map-" + Math.random().toString(36).slice(2));

  const categoryColor = {
    accommodation: "#10b981",
    attraction: "#3b82f6",
    restaurant: "#f59e0b",
    transport: "#8b5cf6",
    other: "#6b7280",
  };

  useEffect(() => {
    // Load Leaflet CSS + JS dynamically
    if (!document.getElementById("leaflet-css")) {
      const link = document.createElement("link");
      link.id = "leaflet-css";
      link.rel = "stylesheet";
      link.href = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css";
      document.head.appendChild(link);
    }

    const initMap = () => {
      if (mapInstanceRef.current) return;
      const L = window.L;
      if (!L) return;

      const container = document.getElementById(containerId.current);
      if (!container) return;

      const center = places.length > 0
        ? [places.reduce((s,p)=>s+p.lat,0)/places.length, places.reduce((s,p)=>s+p.lng,0)/places.length]
        : [35.6812, 139.7671];

      const map = L.map(container, { zoomControl: true, scrollWheelZoom: true });
      mapInstanceRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      // Add markers
      places.forEach(p => {
        const color = categoryColor[p.category] || "#6b7280";
        const markerHtml = `
          <div style="
            width:36px;height:36px;border-radius:50% 50% 50% 0;
            background:${color};border:3px solid white;
            box-shadow:0 2px 8px rgba(0,0,0,0.3);
            transform:rotate(-45deg);
            display:flex;align-items:center;justify-content:center;
          ">
            <div style="transform:rotate(45deg);font-size:14px;line-height:1;">
              ${{ accommodation:"🏨", attraction:"📍", restaurant:"🍽️", transport:"🚆", other:"📌" }[p.category] || "📌"}
            </div>
          </div>`;

        const icon = L.divIcon({
          html: markerHtml,
          className: "",
          iconSize: [36, 36],
          iconAnchor: [18, 36],
          popupAnchor: [0, -38],
        });

        const marker = L.marker([p.lat, p.lng], { icon })
          .addTo(map)
          .bindPopup(`
            <div style="font-family:sans-serif;min-width:140px">
              <div style="font-weight:700;font-size:13px;margin-bottom:4px">${p.name}</div>
              ${p.address ? `<div style="font-size:11px;color:#6b7280;margin-bottom:4px">${p.address}</div>` : ""}
              ${p.booked ? '<span style="background:#d1fae5;color:#065f46;padding:2px 8px;border-radius:99px;font-size:11px;font-weight:600">✓ 已訂</span>' : ""}
            </div>`, { maxWidth: 200 });

        marker.on("click", () => onSelectPlace(p.id));
        markersRef.current[p.id] = marker;
      });

      if (places.length > 0) {
        const bounds = L.latLngBounds(places.map(p => [p.lat, p.lng]));
        map.fitBounds(bounds, { padding: [40, 40] });
      } else {
        map.setView(center, 13);
      }
    };

    if (window.L) {
      initMap();
    } else {
      const script = document.createElement("script");
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js";
      script.onload = initMap;
      document.head.appendChild(script);
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markersRef.current = {};
      }
    };
  }, []);

  // Focus + highlight when focusedId changes
  useEffect(() => {
    const L = window.L;
    if (!L || !mapInstanceRef.current) return;

    Object.entries(markersRef.current).forEach(([id, marker]) => {
      const p = places.find(pl => pl.id === id);
      if (!p) return;
      const color = categoryColor[p.category] || "#6b7280";
      const isActive = id === focusedId;
      const markerHtml = `
        <div style="
          width:${isActive ? 44 : 36}px;height:${isActive ? 44 : 36}px;
          border-radius:50% 50% 50% 0;
          background:${isActive ? "#0ea5e9" : color};
          border:${isActive ? "4px solid white" : "3px solid white"};
          box-shadow:${isActive ? "0 4px 16px rgba(14,165,233,0.6)" : "0 2px 8px rgba(0,0,0,0.3)"};
          transform:rotate(-45deg);
          display:flex;align-items:center;justify-content:center;
          transition:all 0.2s;
        ">
          <div style="transform:rotate(45deg);font-size:${isActive ? 17 : 14}px;line-height:1;">
            ${{ accommodation:"🏨", attraction:"📍", restaurant:"🍽️", transport:"🚆", other:"📌" }[p.category] || "📌"}
          </div>
        </div>`;

      const icon = L.divIcon({
        html: markerHtml,
        className: "",
        iconSize: [isActive ? 44 : 36, isActive ? 44 : 36],
        iconAnchor: [isActive ? 22 : 18, isActive ? 44 : 36],
        popupAnchor: [0, isActive ? -46 : -38],
      });
      marker.setIcon(icon);

      if (isActive) {
        mapInstanceRef.current.setView([p.lat, p.lng], 16, { animate: true });
        marker.openPopup();
      }
    });
  }, [focusedId]);

  return (
    <div
      id={containerId.current}
      ref={mapRef}
      style={{ width: "100%", height: 300, borderRadius: 16, overflow: "hidden", zIndex: 0 }}
    />
  );
}

// ─── Place Detail Sheet ───────────────────────────────────────────────────────
function PlaceDetailSheet({ place, open, onClose, canEdit, onEdit, onDelete }) {
  if (!place) return null;
  const categoryIcon = { accommodation:"🏨", attraction:"📍", restaurant:"🍽️", transport:"🚆", other:"📌" };
  const icon = categoryIcon[place.category] || "📌";
  const mapsUrl = place.mapUrl || `https://maps.google.com/?q=${encodeURIComponent(place.name + " " + (place.address || ""))}`;

  return (
    <Modal open={open} onClose={onClose} title={`${icon} ${place.name}`}>
      <div className="space-y-4">
        {/* Mini map for this place */}
        <div style={{ height: 180, borderRadius: 12, overflow: "hidden", border: "1px solid #f4f4f5" }}>
          <LeafletMap
            places={[place]}
            focusedId={place.id}
            onSelectPlace={() => {}}
          />
        </div>

        {place.address && (
          <div className="flex items-start gap-2">
            <span className="text-zinc-400 mt-0.5 flex-shrink-0">📍</span>
            <p className="text-sm text-zinc-600 flex-1">{place.address}</p>
          </div>
        )}

        <a href={mapsUrl} target="_blank" rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-sky-50 text-sky-600 font-semibold text-sm hover:bg-sky-100 transition-colors">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
          在 Google Maps 開啟
        </a>

        <div className="grid grid-cols-2 gap-2">
          {place.booked && <div className="col-span-2 bg-emerald-50 rounded-xl px-3 py-2 flex items-center gap-2"><span className="text-emerald-600 font-bold text-sm">✓ 已訂/確認</span></div>}
          {place.date && <InfoCell label="日期" value={formatDate(place.date)} />}
          {place.startTime && <InfoCell label="開始時間" value={place.startTime} />}
          {place.meetTime && <InfoCell label="集合時間" value={place.meetTime} />}
          {place.duration && <InfoCell label="活動時長" value={`${place.duration} 分鐘`} />}
          {place.openTime && <InfoCell label="開門時間" value={place.openTime} />}
          {place.closeTime && <InfoCell label="關門時間" value={place.closeTime} />}
          {place.checkIn && <InfoCell label="Check-in" value={place.checkIn} />}
          {place.checkOut && <InfoCell label="Check-out" value={place.checkOut} />}
          {place.stayNights && <InfoCell label="住宿晚數" value={`${place.stayNights} 晚`} />}
        </div>

        {place.note && (
          <div className="bg-amber-50 rounded-xl px-3 py-2.5">
            <p className="text-xs font-semibold text-amber-600 mb-1">💬 備註</p>
            <p className="text-sm text-zinc-700">{place.note}</p>
          </div>
        )}

        {canEdit && (
          <div className="flex gap-2 pt-1">
            <button onClick={() => { onEdit(place); onClose(); }}
              className="flex-1 py-3 rounded-xl bg-zinc-100 text-zinc-700 font-semibold text-sm flex items-center justify-center gap-2 active:bg-zinc-200">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              編輯
            </button>
            <button onClick={() => { onDelete(place.id); onClose(); }}
              className="flex-1 py-3 rounded-xl bg-rose-50 text-rose-600 font-semibold text-sm flex items-center justify-center gap-2 active:bg-rose-100">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3,6 5,6 21,6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>
              刪除
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
}

function InfoCell({ label, value }) {
  return (
    <div className="bg-zinc-50 rounded-xl px-3 py-2">
      <p className="text-xs text-zinc-400 font-medium mb-0.5">{label}</p>
      <p className="text-sm font-semibold text-zinc-700">{value}</p>
    </div>
  );
}

// ─── Map View Tab ─────────────────────────────────────────────────────────────
function MapView({ places, canEdit, onEdit, onDelete }) {
  const [focusedId, setFocusedId] = useState(places[0]?.id || null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailPlace, setDetailPlace] = useState(null);
  const listRef = useRef(null);

  const categoryIcon = { accommodation:"🏨", attraction:"📍", restaurant:"🍽️", transport:"🚆", other:"📌" };

  const handleSelectPlace = (id) => {
    setFocusedId(id);
    // Scroll list item into view
    const el = document.getElementById(`map-list-item-${id}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "nearest" });
  };

  const handleListClick = (p) => {
    setFocusedId(p.id);
  };

  const handleCardClick = (p) => {
    setDetailPlace(p);
    setDetailOpen(true);
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Map */}
      <div style={{ borderRadius: 16, overflow: "hidden", boxShadow: "0 1px 8px rgba(0,0,0,0.08)" }}>
        <LeafletMap places={places} focusedId={focusedId} onSelectPlace={handleSelectPlace} />
      </div>

      {/* Place list */}
      <div>
        <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-2">所有地點</p>
        <div className="space-y-2" ref={listRef}>
          {places.map(p => {
            const isFocused = focusedId === p.id;
            return (
              <div
                key={p.id}
                id={`map-list-item-${p.id}`}
                className={`rounded-xl border-2 transition-all overflow-hidden ${isFocused ? "border-sky-400 shadow-md shadow-sky-100" : "border-zinc-100 bg-white"}`}
              >
                {/* Top row — tap to focus on map */}
                <button
                  onClick={() => handleListClick(p)}
                  className={`w-full text-left flex items-center gap-3 px-3.5 py-3 transition-colors ${isFocused ? "bg-sky-50" : "bg-white hover:bg-zinc-50"}`}
                >
                  <span className="text-xl flex-shrink-0">{categoryIcon[p.category] || "📌"}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`font-semibold text-sm ${isFocused ? "text-sky-700" : "text-zinc-800"}`}>{p.name}</span>
                      {p.booked && <Badge color="green">✓ 已訂</Badge>}
                    </div>
                    {/* Note — 1 line, truncated */}
                    {p.note && (
                      <p className="text-xs text-zinc-400 mt-0.5 truncate">{p.note}</p>
                    )}
                  </div>
                  {/* Badges */}
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    {p.startTime && <Badge color="purple">🕐 {p.startTime}</Badge>}
                    {p.checkIn && <Badge color="blue">入住 {p.checkIn}</Badge>}
                  </div>
                </button>

                {/* Expanded action row when focused */}
                {isFocused && (
                  <div className="flex border-t border-sky-100">
                    <a
                      href={p.mapUrl || `https://maps.google.com/?q=${encodeURIComponent(p.name)}`}
                      target="_blank" rel="noopener noreferrer"
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold text-sky-600 hover:bg-sky-100 transition-colors"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
                      Google Maps
                    </a>
                    <div className="w-px bg-sky-100" />
                    <button
                      onClick={() => handleCardClick(p)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold text-zinc-600 hover:bg-zinc-50 transition-colors"
                    >
                      詳情 →
                    </button>
                    {canEdit && (
                      <>
                        <div className="w-px bg-sky-100" />
                        <button
                          onClick={() => { onEdit(p); }}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold text-amber-600 hover:bg-amber-50 transition-colors"
                        >
                          編輯
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <PlaceDetailSheet
        place={detailPlace}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        canEdit={canEdit}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    </div>
  );
}

// ─── Place Card (schedule / places tab) ──────────────────────────────────────
function PlaceCard({ place, canEdit, onEdit, onDelete }) {
  const [detailOpen, setDetailOpen] = useState(false);
  const categoryIcon = { accommodation:"🏨", attraction:"📍", restaurant:"🍽️", transport:"🚆", other:"📌" };
  const icon = categoryIcon[place.category] || "📌";

  return (
    <>
      <button
        onClick={() => setDetailOpen(true)}
        className="w-full text-left bg-white border border-zinc-100 rounded-xl px-3.5 py-3 active:scale-[0.98] hover:border-sky-200 hover:shadow-sm transition-all duration-150"
      >
        <div className="flex items-center gap-3">
          <div className="text-2xl flex-shrink-0 w-8 text-center">{icon}</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-semibold text-zinc-800 text-sm leading-tight">{place.name}</h4>
              {place.booked && <Badge color="green">✓ 已訂</Badge>}
            </div>
            {/* Note 1 line */}
            {place.note && (
              <p className="text-xs text-zinc-400 mt-0.5 truncate">{place.note}</p>
            )}
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {place.startTime && <Badge color="purple">🕐 {place.startTime}</Badge>}
              {place.meetTime && <Badge color="orange">🤝 {place.meetTime}</Badge>}
              {place.checkIn && <Badge color="blue">入住 {place.checkIn}</Badge>}
              {place.duration && <Badge color="gray">⏱ {place.duration}分</Badge>}
            </div>
          </div>
          <svg className="w-4 h-4 text-zinc-300 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 18l6-6-6-6"/></svg>
        </div>
      </button>
      <PlaceDetailSheet
        place={place}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        canEdit={canEdit}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    </>
  );
}

// ─── Day Schedule ─────────────────────────────────────────────────────────────
function DaySchedule({ date, places, canEdit, onEdit, onDelete }) {
  const accommodation = places.find(p => p.category === "accommodation");
  const activities = places.filter(p => p.category !== "accommodation");
  return (
    <div className="mb-5">
      <div className="flex items-center gap-2 mb-2.5 flex-wrap">
        <div className="bg-sky-500 text-white text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap">
          {formatDate(date)}
        </div>
        {accommodation && (
          <div className="flex items-center gap-1 text-xs text-emerald-700 bg-emerald-50 px-2 py-1 rounded-full min-w-0">
            <span>🏨</span>
            <span className="font-medium truncate">{accommodation.name}</span>
          </div>
        )}
      </div>
      <div className="ml-1 border-l-2 border-sky-100 pl-3 space-y-2">
        {accommodation && <PlaceCard place={accommodation} canEdit={canEdit} onEdit={onEdit} onDelete={onDelete} />}
        {activities.map(p => <PlaceCard key={p.id} place={p} canEdit={canEdit} onEdit={onEdit} onDelete={onDelete} />)}
      </div>
    </div>
  );
}

// ─── Place Add/Edit Modal ─────────────────────────────────────────────────────
function PlaceModal({ open, onClose, onSave, editPlace }) {
  const isEdit = !!editPlace;
  const blank = {
    name:"", address:"", mapUrl:"", category:"attraction",
    booked:false, note:"",
    date:"", startTime:"", meetTime:"", duration:60,
    openTime:"", closeTime:"", checkIn:"15:00", checkOut:"11:00", stayNights:1,
  };
  const [form, setForm] = useState(blank);
  const [urlInput, setUrlInput] = useState("");
  const [urlError, setUrlError] = useState("");

  useEffect(() => {
    setForm(editPlace ? { ...blank, ...editPlace } : blank);
    setUrlInput(editPlace?.mapUrl || "");
    setUrlError("");
  }, [open, editPlace?.id]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleUrlPaste = (val) => {
    setUrlInput(val);
    if (val.includes("maps.google") || val.includes("goo.gl/maps")) {
      const name = parseGoogleMapsUrl(val);
      setForm(f => ({ ...f, mapUrl: val, ...(name ? { name } : {}) }));
      setUrlError(name ? "" : "無法自動解析名稱，請手動填寫");
    }
  };

  const inputCls = "mt-1 w-full border border-zinc-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100";

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? "編輯地點" : "新增地點"}>
      <div className="space-y-4">
        <div>
          <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">Google Maps 連結（可選）</label>
          <input value={urlInput} onChange={e => handleUrlPaste(e.target.value)}
            placeholder="貼上 Google Maps 連結自動帶入名稱…" className={inputCls} />
          {urlError && <p className="text-xs text-rose-500 mt-1">{urlError}</p>}
        </div>
        <div>
          <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">地點名稱 <span className="text-rose-400">*</span></label>
          <input value={form.name} onChange={e => set("name", e.target.value)} placeholder="輸入地點名稱" className={inputCls} />
        </div>
        <div>
          <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-2 block">類別</label>
          <div className="grid grid-cols-3 gap-2">
            {[["accommodation","🏨","住宿"],["attraction","📍","景點"],["restaurant","🍽️","餐廳"],["transport","🚆","交通"],["other","📌","其他"]].map(([v,e,l]) => (
              <button key={v} onClick={() => set("category", v)}
                className={`py-2.5 rounded-xl text-sm font-medium transition-colors flex flex-col items-center gap-0.5 ${form.category === v ? "bg-sky-500 text-white" : "bg-zinc-100 text-zinc-600"}`}>
                <span className="text-base">{e}</span><span className="text-xs">{l}</span>
              </button>
            ))}
          </div>
        </div>
        <button onClick={() => set("booked", !form.booked)}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-colors ${form.booked ? "border-emerald-400 bg-emerald-50" : "border-zinc-200 bg-white"}`}>
          <span className="text-lg">{form.booked ? "✅" : "⬜"}</span>
          <span className={`text-sm font-semibold ${form.booked ? "text-emerald-700" : "text-zinc-600"}`}>
            {form.booked ? "已訂/確認" : "尚未訂（點此標記）"}
          </span>
        </button>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">日期</label>
            <input type="date" value={form.date} onChange={e => set("date", e.target.value)} className={inputCls} />
          </div>
          {form.category === "accommodation" ? (
            <div>
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">入住時間</label>
              <input type="time" value={form.checkIn} onChange={e => set("checkIn", e.target.value)} className={inputCls} />
            </div>
          ) : (
            <div>
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">開始時間</label>
              <input type="time" value={form.startTime} onChange={e => set("startTime", e.target.value)} className={inputCls} />
            </div>
          )}
        </div>
        {form.category !== "accommodation" && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">集合時間</label>
              <input type="time" value={form.meetTime} onChange={e => set("meetTime", e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">時長（分鐘）</label>
              <input type="number" value={form.duration} onChange={e => set("duration", parseInt(e.target.value))} className={inputCls} />
            </div>
          </div>
        )}
        {form.category === "accommodation" && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">退房時間</label>
              <input type="time" value={form.checkOut} onChange={e => set("checkOut", e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">住宿晚數</label>
              <input type="number" min="1" value={form.stayNights} onChange={e => set("stayNights", parseInt(e.target.value))} className={inputCls} />
            </div>
          </div>
        )}
        <div>
          <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">備註</label>
          <textarea value={form.note} onChange={e => set("note", e.target.value)}
            rows={2} placeholder="備注、注意事項…" className={inputCls + " resize-none"} />
        </div>
        <button
          onClick={() => { if (!form.name.trim()) return; onSave({ ...form, id: editPlace?.id || `p-${Date.now()}` }); onClose(); }}
          className="w-full bg-sky-500 text-white font-bold py-3.5 rounded-xl text-sm active:bg-sky-700 transition-colors">
          {isEdit ? "儲存變更" : "加入旅程 ＋"}
        </button>
      </div>
    </Modal>
  );
}

// ─── Members Modal ────────────────────────────────────────────────────────────
function MembersModal({ open, onClose, trip, canManage }) {
  const [copied, setCopied] = useState(false);
  const inviteLink = `https://tripplan.app/join/${trip?.id}?token=abc123`;
  const permLabel = { admin:"管理者", edit:"可編輯", view:"僅觀看" };
  const permColor = { admin:"purple", edit:"blue", view:"gray" };
  const copyLink = () => {
    navigator.clipboard?.writeText(inviteLink).catch(() => {});
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };
  return (
    <Modal open={open} onClose={onClose} title="旅程成員">
      <div className="space-y-5">
        {canManage && (
          <div className="bg-sky-50 rounded-xl p-4">
            <p className="text-xs font-semibold text-sky-700 mb-2">📨 邀請連結</p>
            <div className="flex gap-2">
              <input readOnly value={inviteLink} className="flex-1 text-xs bg-white border border-sky-200 rounded-lg px-3 py-2 text-zinc-500 min-w-0" />
              <button onClick={copyLink} className={`px-3 py-2 rounded-lg text-xs font-bold whitespace-nowrap ${copied ? "bg-emerald-500 text-white" : "bg-sky-500 text-white"}`}>
                {copied ? "✓ 已複製" : "複製"}
              </button>
            </div>
            <p className="text-xs text-sky-500 mt-2">對方點擊連結後可選擇暱稱加入旅程</p>
          </div>
        )}
        <div className="space-y-2">
          {trip?.members.map(m => (
            <div key={m.id} className="flex items-center gap-3 p-3 bg-zinc-50 rounded-xl">
              <Avatar name={m.name} />
              <p className="text-sm font-semibold text-zinc-700 flex-1">{m.name}</p>
              <Badge color={permColor[m.permission]}>{permLabel[m.permission]}</Badge>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
}

// ─── Trip Detail ──────────────────────────────────────────────────────────────
function TripDetail({ trip: initialTrip, currentUser, onBack }) {
  const [trip, setTrip] = useState(initialTrip);
  const [tab, setTab] = useState("schedule");
  const [placeModal, setPlaceModal] = useState(false);
  const [editPlace, setEditPlace] = useState(null);
  const [membersModal, setMembersModal] = useState(false);

  const me = trip.members.find(m => m.name === currentUser);
  const perms = PERMISSIONS[me?.permission || "view"];
  const scheduledByDate = groupByDate(trip.places.filter(p => p.booked && p.date));
  const unscheduled = trip.places.filter(p => !p.date || !p.booked);

  const handleSavePlace = (place) => {
    setTrip(t => ({ ...t, places: editPlace ? t.places.map(p => p.id === place.id ? place : p) : [...t.places, place] }));
    setEditPlace(null);
  };
  const handleDeletePlace = (id) => setTrip(t => ({ ...t, places: t.places.filter(p => p.id !== id) }));
  const handleEditPlace = (place) => { setEditPlace(place); setPlaceModal(true); };

  const tabs = [["schedule","📅","行程"],["places","📍","地點"],["map","🗺️","地圖"]];

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col">
      <div className="bg-white border-b border-zinc-100 sticky top-0 z-30">
        <div className="px-4 py-3 flex items-center gap-3 max-w-2xl mx-auto">
          <button onClick={onBack} className="w-9 h-9 rounded-full hover:bg-zinc-100 active:bg-zinc-200 flex items-center justify-center text-zinc-500 flex-shrink-0">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 12H5m7-7l-7 7 7 7"/></svg>
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-zinc-800 text-base leading-tight truncate">{trip.coverEmoji} {trip.name}</h1>
            <p className="text-xs text-zinc-400 truncate">{trip.dateRange}</p>
          </div>
          <button onClick={() => setMembersModal(true)} className="flex -space-x-2 flex-shrink-0">
            {trip.members.slice(0, 3).map(m => <Avatar key={m.id} name={m.name} />)}
            {trip.members.length > 3 && (
              <div className="w-7 h-7 rounded-full bg-zinc-200 flex items-center justify-center text-xs text-zinc-500 font-bold border-2 border-white">+{trip.members.length - 3}</div>
            )}
          </button>
        </div>
        <div className="flex max-w-2xl mx-auto border-t border-zinc-50">
          {tabs.map(([v, e, l]) => (
            <button key={v} onClick={() => setTab(v)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-semibold transition-colors border-b-2 ${tab === v ? "border-sky-500 text-sky-600" : "border-transparent text-zinc-400"}`}>
              <span>{e}</span><span>{l}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 py-5 pb-24">
          {tab === "schedule" && (
            <div>
              {Object.keys(scheduledByDate).length === 0 && unscheduled.length === 0 && (
                <div className="text-center py-16 text-zinc-400">
                  <p className="text-5xl mb-3">📅</p>
                  <p className="text-sm font-medium">尚無行程</p>
                  <p className="text-xs mt-1">點擊右下角 + 新增地點</p>
                </div>
              )}
              {Object.entries(scheduledByDate).sort().map(([date, places]) => (
                <DaySchedule key={date} date={date} places={places} canEdit={perms.canEdit} onEdit={handleEditPlace} onDelete={handleDeletePlace} />
              ))}
              {unscheduled.length > 0 && (
                <div className="mt-2">
                  <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-3">候選地點（未排定）</p>
                  <div className="space-y-2">
                    {unscheduled.map(p => <PlaceCard key={p.id} place={p} canEdit={perms.canEdit} onEdit={handleEditPlace} onDelete={handleDeletePlace} />)}
                  </div>
                </div>
              )}
            </div>
          )}
          {tab === "places" && (
            <div className="space-y-2">
              {trip.places.length === 0 && (
                <div className="text-center py-16 text-zinc-400">
                  <p className="text-5xl mb-3">📍</p>
                  <p className="text-sm font-medium">尚未加入任何地點</p>
                </div>
              )}
              {trip.places.map(p => <PlaceCard key={p.id} place={p} canEdit={perms.canEdit} onEdit={handleEditPlace} onDelete={handleDeletePlace} />)}
            </div>
          )}
          {tab === "map" && <MapView places={trip.places} canEdit={perms.canEdit} onEdit={handleEditPlace} onDelete={handleDeletePlace} />}
        </div>
      </div>

      {perms.canEdit && (
        <div className="fixed bottom-6 right-4 sm:right-6 z-20">
          <button onClick={() => { setEditPlace(null); setPlaceModal(true); }}
            className="w-14 h-14 bg-sky-500 active:bg-sky-700 text-white rounded-2xl shadow-xl shadow-sky-200 flex items-center justify-center text-2xl transition-transform active:scale-95">
            +
          </button>
        </div>
      )}

      <PlaceModal open={placeModal} onClose={() => { setPlaceModal(false); setEditPlace(null); }} onSave={handleSavePlace} editPlace={editPlace} />
      <MembersModal open={membersModal} onClose={() => setMembersModal(false)} trip={trip} canManage={perms.canManageMembers} />
    </div>
  );
}

// ─── New Trip Modal ───────────────────────────────────────────────────────────
function NewTripModal({ open, onClose, onCreate }) {
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("✈️");
  const emojis = ["✈️","🗼","🏖️","🏔️","🗺️","🌸","🎡","🏯","🌅","🚢","🌏","🎌"];
  const handleCreate = () => {
    if (!name.trim()) return;
    onCreate({ name: name.trim(), coverEmoji: emoji });
    setName(""); setEmoji("✈️"); onClose();
  };
  return (
    <Modal open={open} onClose={onClose} title="建立新旅程">
      <div className="space-y-5">
        <div>
          <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-2 block">旅程封面</label>
          <div className="grid grid-cols-6 gap-2">
            {emojis.map(e => (
              <button key={e} onClick={() => setEmoji(e)}
                className={`aspect-square rounded-xl text-2xl flex items-center justify-center transition-all ${emoji === e ? "bg-sky-100 ring-2 ring-sky-400 scale-110" : "bg-zinc-100"}`}>
                {e}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">旅程名稱</label>
          <input value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key === "Enter" && handleCreate()}
            placeholder="給旅程取個名字…"
            className="mt-1 w-full border border-zinc-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100" />
        </div>
        <button onClick={handleCreate} className="w-full bg-sky-500 text-white font-bold py-3.5 rounded-xl text-sm active:bg-sky-700">
          建立旅程 🚀
        </button>
      </div>
    </Modal>
  );
}

// ─── Home ─────────────────────────────────────────────────────────────────────
function Home({ onSelectTrip, trips, onCreateTrip }) {
  const [newTripModal, setNewTripModal] = useState(false);
  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="max-w-2xl mx-auto px-4 pt-12 pb-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-black text-zinc-800">旅程規劃</h1>
            <p className="text-zinc-400 text-sm mt-0.5">和朋友一起規劃完美行程 🌍</p>
          </div>
          <div className="flex items-center gap-2">
            <Avatar name="Shulin" size="lg" />
            <span className="text-sm font-semibold text-zinc-700 hidden sm:block">Shulin</span>
          </div>
        </div>
        <div className="space-y-3 mb-5">
          {trips.map(trip => (
            <button key={trip.id} onClick={() => onSelectTrip(trip)}
              className="w-full text-left bg-white rounded-2xl p-4 shadow-sm border border-zinc-100 active:scale-[0.98] hover:border-sky-200 hover:shadow-md transition-all">
              <div className="flex items-center gap-3.5">
                <div className="w-14 h-14 bg-gradient-to-br from-sky-100 to-blue-200 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0">{trip.coverEmoji}</div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-zinc-800 text-sm sm:text-base truncate">{trip.name}</h3>
                  <p className="text-xs text-zinc-400 mt-0.5">{trip.dateRange || "日期未定"}</p>
                  <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                    <div className="flex -space-x-1.5">{trip.members.slice(0, 4).map(m => <Avatar key={m.id} name={m.name} />)}</div>
                    <span className="text-xs text-zinc-400">{trip.members.length} 位成員</span>
                    <span className="text-xs text-zinc-200">·</span>
                    <span className="text-xs text-zinc-400">{trip.places.length} 個地點</span>
                  </div>
                </div>
                <svg className="w-4 h-4 text-zinc-300 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 18l6-6-6-6"/></svg>
              </div>
            </button>
          ))}
        </div>
        <button onClick={() => setNewTripModal(true)}
          className="w-full bg-sky-500 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-sky-100 text-sm active:bg-sky-700">
          <span className="text-lg">+</span><span>建立新旅程</span>
        </button>
      </div>
      <NewTripModal open={newTripModal} onClose={() => setNewTripModal(false)} onCreate={onCreateTrip} />
    </div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [trips, setTrips] = useState(MOCK_TRIPS);
  const [selectedTrip, setSelectedTrip] = useState(null);
  const currentUser = "Shulin";

  const handleCreateTrip = ({ name, coverEmoji }) => {
    const newTrip = {
      id: `trip-${Date.now()}`, name, coverEmoji, dateRange: "", owner: currentUser,
      members: [{ id: `m-${Date.now()}`, name: currentUser, role: "owner", permission: "admin" }],
      places: [],
    };
    setTrips(t => [...t, newTrip]);
    setSelectedTrip(newTrip);
  };

  if (selectedTrip) {
    const live = trips.find(t => t.id === selectedTrip.id) || selectedTrip;
    return <TripDetail trip={live} currentUser={currentUser} onBack={() => setSelectedTrip(null)} />;
  }
  return <Home trips={trips} onSelectTrip={setSelectedTrip} onCreateTrip={handleCreateTrip} />;
}
