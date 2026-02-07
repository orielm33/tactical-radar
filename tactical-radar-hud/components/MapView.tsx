
import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Threat, Coordinate } from '../types';

interface MapViewProps {
  userLocation: Coordinate | null;
  threats: Threat[];
  heading: number;
  locked: boolean;
  onUserInteraction: () => void;
}

const MapView: React.FC<MapViewProps> = ({ userLocation, threats, heading, locked, onUserInteraction }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const rangeRingsRef = useRef<L.LayerGroup | null>(null);
  const threatMarkersRef = useRef<Map<string, L.Marker>>(new Map());
  const [rotationOffset, setRotationOffset] = useState(0);

  const getRiskColor = (level: string) => {
    switch(level) {
      case 'HIGH': return '#ff0000';
      case 'MED': return '#ffaa00';
      default: return '#00ff00';
    }
  };

  useEffect(() => {
    if (!mapContainerRef.current) return;

    const map = L.map(mapContainerRef.current, {
      zoomControl: false,
      attributionControl: false,
      center: [33, 35],
      zoom: 5,
      maxZoom: 18,
      minZoom: 3,
    });

    // Stable Tactical Grid Tile Provider
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 20,
    }).addTo(map);

    map.on('mousedown', onUserInteraction);
    map.on('touchstart', onUserInteraction);
    map.on('wheel', onUserInteraction);

    rangeRingsRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    const handleResize = () => {
      const orientation = (window.orientation as number) || 0;
      setRotationOffset(orientation);
      if (mapRef.current) {
        mapRef.current.invalidateSize();
      }
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    handleResize();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
      map.remove();
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current || !userLocation) return;
    const map = mapRef.current;
    
    if (!userMarkerRef.current) {
      const tacticalIcon = L.divIcon({
        className: 'user-marker-icon',
        html: `<div class="w-6 h-6 border-2 border-white rounded-full bg-[#00ff00] shadow-[0_0_15px_#00ff00]"></div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      });
      userMarkerRef.current = L.marker([userLocation.lat, userLocation.lng], { icon: tacticalIcon }).addTo(map);
    } else {
      userMarkerRef.current.setLatLng([userLocation.lat, userLocation.lng]);
    }

    if (rangeRingsRef.current) {
      rangeRingsRef.current.clearLayers();
      [100000, 250000, 500000].forEach(radius => {
        L.circle([userLocation.lat, userLocation.lng], {
          color: '#00ff00',
          weight: 1,
          opacity: 0.15,
          fill: false,
          radius
        }).addTo(rangeRingsRef.current!);
      });
    }

    if (locked) {
      map.setView([userLocation.lat, userLocation.lng], map.getZoom(), { animate: true });
    }
  }, [userLocation, locked]);

  useEffect(() => {
    if (!mapRef.current) return;
    threats.forEach(threat => {
      const color = getRiskColor(threat.riskLevel);
      let marker = threatMarkersRef.current.get(threat.id);
      const threatIcon = L.divIcon({
        className: 'threat-marker-icon',
        html: `<div class="w-4 h-4 rounded-sm rotate-45" style="background-color: ${color}; box-shadow: 0 0 10px ${color}"></div>`,
        iconSize: [16, 16],
        iconAnchor: [8, 8]
      });
      if (!marker) {
        marker = L.marker([threat.location.lat, threat.location.lng], { icon: threatIcon }).addTo(mapRef.current!);
        threatMarkersRef.current.set(threat.id, marker);
      } else {
        marker.setLatLng([threat.location.lat, threat.location.lng]);
        marker.setIcon(threatIcon);
      }
    });
  }, [threats]);

  useEffect(() => {
    if (!mapContainerRef.current) return;
    const visualHeading = heading + rotationOffset;
    mapContainerRef.current.style.transform = `rotate(${-visualHeading}deg)`;
  }, [heading, rotationOffset]);

  return (
    <div className="relative w-full h-full overflow-hidden bg-black">
      <div 
        ref={mapContainerRef} 
        className="tactical-map-filter absolute inset-[-150%] w-[400%] h-[400%] transition-[filter] duration-500"
      />
      <div className="radar-sweep"></div>
    </div>
  );
};

export default MapView;
