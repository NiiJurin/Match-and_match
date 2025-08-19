import React from "react";

type Props = {
  locationText: string;
  pos?: { lat: number; lng: number } | null;
};

export default function LocationActions({ locationText, pos }: Props) {
  const queryForSearch = pos
    ? `${pos.lat},${pos.lng}`
    : encodeURIComponent(locationText || "");

  const gmap = `https://www.google.com/maps/search/?api=1&query=${queryForSearch}`;
  const gdir = `https://www.google.com/maps/dir/?api=1&destination=${queryForSearch}`;

  const apple = pos
    ? `https://maps.apple.com/?ll=${pos.lat},${pos.lng}&q=${encodeURIComponent(locationText || "")}`
    : `https://maps.apple.com/?q=${encodeURIComponent(locationText || "")}`;

  const osm = pos
    ? `https://www.openstreetmap.org/?mlat=${pos.lat}&mlon=${pos.lng}#map=17/${pos.lat}/${pos.lng}`
    : `https://www.openstreetmap.org/search?query=${encodeURIComponent(locationText || "")}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(locationText);
    } catch {}
  };

  return (
    <div className="post-actions" style={{ marginTop: 8, gap: 6 }}>
      <a className="btn" href={gmap} target="_blank" rel="noreferrer">Google Map</a>
      {/* <a className="btn" href={gdir} target="_blank" rel="noreferrer">経路を表示</a> */}
      {/* <a className="btn" href={apple} target="_blank" rel="noreferrer">Appleマップ</a> */}
      {/* <a className="btn" href={osm} target="_blank" rel="noreferrer">OSM</a> */}
      <button type="button" className="btn" onClick={copy}>住所をコピー</button>
    </div>
  );
}
