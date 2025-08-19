// components/MapPicker.tsx
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useMemo } from 'react';

// Next/Leafletのビルド対策（マーカー画像）
delete (L.Icon.Default as any).prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

type Pos = { lat: number; lng: number };
type Props = {
  position: Pos | null;
  onChange: (p: Pos) => void;
  onAddressFromMap?: (addr: string) => void; // 逆ジオコーディングで住所をフォームに反映
};

function ClickPick({ onPick }: { onPick: (p: Pos) => void }) {
  useMapEvents({
    click(e) {
      onPick({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

export default function MapPicker({ position, onChange, onAddressFromMap }: Props) {
  const center = useMemo<Pos>(
    () => position ?? { lat: 35.681236, lng: 139.767125 }, // 東京駅あたり
    [position]
  );

  // 逆ジオコーディング（Nominatim）
  async function reverse(lat: number, lng: number) {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=ja`
      );
      const j = await res.json();
      if (j?.display_name) onAddressFromMap?.(j.display_name as string);
    } catch {}
  }

  return (
    <div style={{ height: 300, borderRadius: 12, overflow: 'hidden', border: '1px solid var(--line)' }}>
      <MapContainer
        center={[center.lat, center.lng]}
        zoom={15}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="&copy; OpenStreetMap contributors"
        />
        {position && <Marker position={[position.lat, position.lng]} />}
        <ClickPick
          onPick={(p) => {
            onChange(p);
            reverse(p.lat, p.lng);
          }}
        />
      </MapContainer>
    </div>
  );
}
