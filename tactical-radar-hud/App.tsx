
import React, { useState, useEffect, useCallback, useRef } from 'react';
import MapView from './components/MapView';
import RadarUI from './components/RadarUI';
import { Threat, SystemStatus, Coordinate, HFCAlert, RiskLevel } from './types';
import { calculateDistance, normalizeHeading } from './utils/geo';
import { GoogleGenAI, Type } from "@google/genai";

const INITIAL_THREATS: Threat[] = [
  { id: 'leb', name: 'Lebanon', location: { lat: 33.9, lng: 35.5 }, riskLevel: 'HIGH' },
  { id: 'gaz', name: 'Gaza', location: { lat: 31.4, lng: 34.4 }, riskLevel: 'HIGH' },
  { id: 'yem', name: 'Yemen', location: { lat: 15.3, lng: 44.2 }, riskLevel: 'MED' },
  { id: 'ira', name: 'Iran', location: { lat: 32.6, lng: 53.6 }, riskLevel: 'MED' },
  { id: 'syr', name: 'Syria', location: { lat: 33.5, lng: 36.3 }, riskLevel: 'MED' },
];

const App: React.FC = () => {
  const [status, setStatus] = useState<SystemStatus>(SystemStatus.STANDBY);
  const [userLocation, setUserLocation] = useState<Coordinate | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [heading, setHeading] = useState<number>(0);
  const [threats, setThreats] = useState<Threat[]>(INITIAL_THREATS);
  const [hfcAlerts, setHfcAlerts] = useState<HFCAlert[]>([]);
  const [alertHistory, setAlertHistory] = useState<HFCAlert[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [mapLocked, setMapLocked] = useState(true);
  const [error, setError] = useState<string | undefined>();
  const [activeRealTimeAlert, setActiveRealTimeAlert] = useState<HFCAlert | null>(null);
  
  const [intelReport, setIntelReport] = useState<{ 
    text: string; 
    translatedText?: string; 
    sources: any[]; 
    loading: boolean; 
    translating?: boolean;
  } | null>(null);

  const handleLocationUpdate = useCallback((position: GeolocationPosition) => {
    const { latitude, longitude, accuracy: acc } = position.coords;
    const newLoc = { lat: latitude, lng: longitude };
    setUserLocation(newLoc);
    setAccuracy(acc);
    setThreats(prev => prev.map(t => ({ ...t, distance: calculateDistance(newLoc, t.location) })));
  }, []);

  const handleOrientation = (event: DeviceOrientationEvent) => {
    let compass = (event as any).webkitCompassHeading || (event.alpha !== null ? 360 - event.alpha : 0);
    setHeading(normalizeHeading(compass));
  };

  const startSystem = async () => {
    setStatus(SystemStatus.INITIALIZING);
    
    if (navigator.geolocation) {
      navigator.geolocation.watchPosition(handleLocationUpdate, (e) => setError(`GPS: ${e.message}`), { 
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 10000
      });
    }

    try {
      if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
        const response = await (DeviceOrientationEvent as any).requestPermission();
        if (response === 'granted') {
          window.addEventListener('deviceorientation', handleOrientation);
        }
      } else {
        window.addEventListener('deviceorientation', handleOrientation, true);
      }
    } catch (e) { console.warn(e); }

    setStatus(SystemStatus.ACTIVE);
    fetchAlertHistory();
    const interval = setInterval(pollRealTimeAlerts, 60000);
    return () => clearInterval(interval);
  };

  const fetchAlertHistory = async () => {
    setIsScanning(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Search for official Home Front Command (Pikud HaOref) alert history in Israel from the last 48 hours. 
        Only include REAL, verified alerts. Extract the last 15.
        Return JSON list. Each item MUST have 'area', 'time', 'date', 'type'.
        Current System Time: ${new Date().toISOString()}`,
        config: {
          tools: [{ googleSearch: {} }],
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                area: { type: Type.STRING },
                time: { type: Type.STRING },
                date: { type: Type.STRING },
                type: { type: Type.STRING }
              },
              required: ["area", "time", "date", "type"]
            }
          }
        },
      });
      
      const rawData = JSON.parse(response.text);
      const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
      const sourceUrl = sources[0]?.web?.uri || "";

      const formatted = rawData.map((item: any, idx: number) => ({
        ...item,
        id: `hist-${idx}-${Date.now()}`,
        sourceUrl: sourceUrl
      }));
      setAlertHistory(formatted);
      setHfcAlerts(formatted.slice(0, 5));
    } catch (e) {
      console.error("History fetch failed", e);
    } finally {
      setIsScanning(false);
    }
  };

  const pollRealTimeAlerts = async () => {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Check Home Front Command (Pikud HaOref) or official Israeli news for ANY active rocket sirens or security events in the last 10 minutes.
        If NO sirens are active, return an empty JSON array []. 
        Do NOT hallucinate or return old alerts. 
        Return ONLY valid JSON for current alerts.`,
        config: {
          tools: [{ googleSearch: {} }],
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                area: { type: Type.STRING },
                type: { type: Type.STRING }
              },
              required: ["area", "type"]
            }
          }
        },
      });

      const newAlerts = JSON.parse(response.text);
      if (newAlerts && newAlerts.length > 0) {
        const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
        const alert = {
          id: `rt-${Date.now()}`,
          area: newAlerts[0].area,
          type: newAlerts[0].type,
          time: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
          date: new Date().toLocaleDateString('en-GB'),
          isNew: true,
          sourceUrl: sources[0]?.web?.uri || ""
        };
        setActiveRealTimeAlert(alert);
        setAlertHistory(prev => [alert, ...prev]);
        setTimeout(() => setActiveRealTimeAlert(null), 15000);
      }
    } catch (e) {
      console.warn("RT Poll error", e);
    }
  };

  const getIntel = async (threat: Threat) => {
    setIntelReport({ text: "", sources: [], loading: true });
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Provide a factual, military sitrep for the ${threat.name} border sector from the last 24 hours. Cite specific events if they occurred. Under 80 words.`,
        config: { tools: [{ googleSearch: {} }] },
      });
      setIntelReport({ 
        text: response.text || "NO RECENT DATA.", 
        sources: response.candidates?.[0]?.groundingMetadata?.groundingChunks || [], 
        loading: false 
      });
    } catch (e) { 
      setIntelReport(null); 
      setError("INTEL_FETCH_ERROR");
    }
  };

  const translateIntel = async () => {
    if (!intelReport) return;
    setIntelReport(prev => prev ? { ...prev, translating: true } : null);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Translate the following military report to Hebrew. Ensure professional terminology:\n\n${intelReport.text}`,
      });
      setIntelReport(prev => prev ? { ...prev, translatedText: response.text, translating: false } : null);
    } catch (e) { 
      setIntelReport(prev => prev ? { ...prev, translating: false } : null); 
    }
  };

  return (
    <div className="w-full h-full bg-black overflow-hidden select-none">
      <MapView 
        userLocation={userLocation} 
        threats={threats} 
        heading={heading} 
        locked={mapLocked}
        onUserInteraction={() => setMapLocked(false)}
      />
      <RadarUI 
        status={status} 
        heading={heading} 
        threats={threats} 
        userLocation={userLocation}
        accuracy={accuracy}
        onStart={startSystem} 
        onAnalyze={getIntel}
        intelReport={intelReport} 
        onCloseIntel={() => setIntelReport(null)} 
        onTranslateIntel={translateIntel}
        hfcAlerts={hfcAlerts} 
        alertHistory={alertHistory}
        realTimeAlert={activeRealTimeAlert}
        isScanning={isScanning} 
        mapLocked={mapLocked} 
        onToggleLock={() => setMapLocked(!mapLocked)}
        error={error}
        onRefreshHistory={fetchAlertHistory}
      />
    </div>
  );
};

export default App;
