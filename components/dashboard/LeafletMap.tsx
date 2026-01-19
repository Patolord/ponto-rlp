"use client";

import { useEffect, useState } from "react";
import type { PontoCheck, Worksite } from "@/lib/rhid";

type LeafletMapProps = {
  checks: PontoCheck[];
  worksites: Worksite[];
  selectedEmployee?: number | null;
  selectedWorksite?: number | null;
  filterType?: number | null; // null = todos, 0-3 = specific type
};

// São Paulo coordinates as default center
const DEFAULT_CENTER: [number, number] = [-23.55, -46.63];
const DEFAULT_ZOOM = 11;

export default function LeafletMap({
  checks,
  worksites,
  selectedEmployee,
  selectedWorksite,
  filterType,
}: LeafletMapProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [MapComponents, setMapComponents] = useState<{
    MapContainer: typeof import("react-leaflet").MapContainer;
    TileLayer: typeof import("react-leaflet").TileLayer;
    Marker: typeof import("react-leaflet").Marker;
    Popup: typeof import("react-leaflet").Popup;
    Circle: typeof import("react-leaflet").Circle;
    L: typeof import("leaflet");
  } | null>(null);

  useEffect(() => {
    setIsMounted(true);
    
    // Dynamically import both react-leaflet and leaflet
    Promise.all([
      import("react-leaflet"),
      import("leaflet"),
    ]).then(([reactLeaflet, leaflet]) => {
      setMapComponents({
        MapContainer: reactLeaflet.MapContainer,
        TileLayer: reactLeaflet.TileLayer,
        Marker: reactLeaflet.Marker,
        Popup: reactLeaflet.Popup,
        Circle: reactLeaflet.Circle,
        L: leaflet.default,
      });
    });
  }, []);

  // Filter checks based on selection and ensure GPS coordinates exist for map display
  const filteredChecks = checks.filter((check) => {
    // Must have valid GPS coordinates to display on map
    if (!check.latitude || !check.longitude) {
      return false;
    }
    if (selectedEmployee && check.funcionarioId !== selectedEmployee) {
      return false;
    }
    if (selectedWorksite && check.obraId !== selectedWorksite) {
      return false;
    }
    // Filter by check type number (0=entrada, 1=almoco, 2=retorno, 3=saida)
    if (filterType !== null && check.tipoNumero !== filterType) {
      return false;
    }
    return true;
  });

  // Calculate map center based on checks (filteredChecks already have valid coordinates)
  const mapCenter: [number, number] =
    filteredChecks.length > 0
      ? [
          filteredChecks.reduce((sum, c) => sum + (c.latitude ?? 0), 0) /
            filteredChecks.length,
          filteredChecks.reduce((sum, c) => sum + (c.longitude ?? 0), 0) /
            filteredChecks.length,
        ]
      : DEFAULT_CENTER;

  if (!isMounted || !MapComponents) {
    return (
      <div className="w-full h-full bg-slate-800 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-400 text-sm">Carregando mapa...</p>
        </div>
      </div>
    );
  }

  const { MapContainer, TileLayer, Marker, Popup, Circle, L } = MapComponents;

  // Create custom icon for employee markers
  const createEmployeeIcon = (foto?: string, tipoNumero?: number) => {
    // 0=entrada (green), 1=almoco (amber), 2=retorno (blue), 3=saida (red)
    const colorMap: Record<number, string> = {
      0: "#22c55e", // green - entrada
      1: "#f59e0b", // amber - almoco saida
      2: "#3b82f6", // blue - retorno
      3: "#ef4444", // red - saida
    };
    const color = colorMap[tipoNumero ?? 0] || "#6366f1";

    return L.divIcon({
      className: "custom-employee-marker",
      html: `
        <div style="
          width: 44px;
          height: 44px;
          border-radius: 50%;
          border: 3px solid ${color};
          background: white;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        ">
          ${
            foto
              ? `<img src="${foto}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;" onerror="this.style.display='none'" />`
              : `<div style="
                  width: 100%;
                  height: 100%;
                  background: linear-gradient(135deg, #6366f1, #3b82f6);
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  color: white;
                  font-weight: bold;
                  font-size: 14px;
                ">?</div>`
          }
        </div>
      `,
      iconSize: [44, 44],
      iconAnchor: [22, 22],
      popupAnchor: [0, -22],
    });
  };

  const getCheckTypeLabel = (tipoNumero: number) => {
    const labels: Record<number, string> = {
      0: "Entrada",
      1: "Saída Almoço",
      2: "Retorno Almoço",
      3: "Saída",
    };
    return labels[tipoNumero] || `Tipo ${tipoNumero}`;
  };

  const getCheckTypeColor = (tipoNumero: number) => {
    const colors: Record<number, string> = {
      0: "bg-green-500",
      1: "bg-amber-500",
      2: "bg-blue-500",
      3: "bg-red-500",
    };
    return colors[tipoNumero] || "bg-gray-500";
  };

  // Get unique geofences for circles
  const uniqueGeofences = new Map<number, PontoCheck["geofence"]>();
  for (const check of filteredChecks) {
    if (check.geofence && !uniqueGeofences.has(check.geofence.id)) {
      uniqueGeofences.set(check.geofence.id, check.geofence);
    }
  }

  return (
    <>
      {/* Leaflet CSS */}
      <link
        rel="stylesheet"
        href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
        integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
        crossOrigin=""
      />
      <style>{`
        .custom-employee-marker {
          background: transparent !important;
          border: none !important;
        }
        .leaflet-popup-content-wrapper {
          border-radius: 12px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.15);
        }
        .leaflet-popup-content {
          margin: 12px 16px;
        }
        .geofence-name-badge {
          background: #3b82f6;
          color: white;
          padding: 4px 12px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 600;
          white-space: nowrap;
          box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        }
        .geofence-label-wrapper {
          background: transparent !important;
          border: none !important;
        }
      `}</style>

      <MapContainer
        center={mapCenter}
        zoom={DEFAULT_ZOOM}
        className="w-full h-full"
        zoomControl={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Geofence circles */}
        {Array.from(uniqueGeofences.values()).map((geofence) => geofence && (
          <Circle
            key={geofence.id}
            center={[geofence.latitude, geofence.longitude]}
            radius={geofence.radius}
            pathOptions={{
              color: "#3b82f6",
              fillColor: "#3b82f6",
              fillOpacity: 0.1,
              weight: 2,
            }}
          >
            <Popup>
              <div className="text-center">
                <p className="font-semibold text-slate-800">{geofence.name}</p>
              </div>
            </Popup>
          </Circle>
        ))}

        {/* Employee markers - only render checks with valid coordinates */}
        {filteredChecks.map((check) => (
          <Marker
            key={check.id}
            position={[check.latitude!, check.longitude!]}
            icon={createEmployeeIcon(check.funcionarioFoto, check.tipoNumero)}
          >
            <Popup>
              <div className="min-w-[180px]">
                <div className="flex items-center gap-3 mb-2">
                  {check.funcionarioFoto ? (
                    <img
                      src={check.funcionarioFoto}
                      alt={check.funcionarioNome}
                      className="w-10 h-10 rounded-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-white font-bold">
                      {check.funcionarioNome.charAt(0)}
                    </div>
                  )}
                  <div>
                    <p className="font-semibold text-slate-800">
                      {check.funcionarioNome}
                    </p>
                    {check.obraNome && (
                      <p className="text-xs text-slate-500">{check.obraNome}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-block w-2 h-2 rounded-full ${getCheckTypeColor(check.tipoNumero)}`}
                  />
                  <span className="text-sm text-slate-600">
                    {getCheckTypeLabel(check.tipoNumero)}
                  </span>
                  <span className="text-sm text-slate-400 ml-auto">
                    {check.dataHoraStr || new Date(check.dataHora).toLocaleTimeString("pt-BR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </>
  );
}
