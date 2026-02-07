
import React, { useState, useEffect } from 'react';
import { Threat, SystemStatus, HFCAlert } from '../types';

interface RadarUIProps {
  status: SystemStatus;
  heading: number;
  threats: Threat[];
  userLocation: { lat: number, lng: number } | null;
  accuracy: number | null;
  onStart: () => void;
  onAnalyze: (threat: Threat) => void;
  intelReport: { 
    text: string; 
    translatedText?: string; 
    sources: any[]; 
    loading: boolean; 
    translating?: boolean;
  } | null;
  onCloseIntel: () => void;
  onTranslateIntel: () => void;
  hfcAlerts: HFCAlert[];
  alertHistory: HFCAlert[];
  realTimeAlert: HFCAlert | null;
  isScanning: boolean;
  mapLocked: boolean;
  onToggleLock: () => void;
  error?: string;
  onRefreshHistory: () => void;
}

const RadarUI: React.FC<RadarUIProps> = ({ 
  status, heading, threats, userLocation, accuracy, onStart, onAnalyze, intelReport, onCloseIntel, onTranslateIntel, hfcAlerts, alertHistory, realTimeAlert, isScanning, mapLocked, onToggleLock, error, onRefreshHistory 
}) => {
  const [now, setNow] = useState(new Date());
  const [showTranslated, setShowTranslated] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (intelReport && !intelReport.loading) {
      setShowTranslated(!!intelReport.translatedText);
    } else {
      setShowTranslated(false);
    }
  }, [intelReport?.text, intelReport?.translatedText]);

  const getRiskColor = (level: string) => {
    switch(level) {
      case 'HIGH': return '#ff0000';
      case 'MED': return '#ffaa00';
      default: return '#00ff00';
    }
  };

  const getAccuracyStatus = (acc: number | null) => {
    if (acc === null) return { text: "NO SIGNAL", color: "text-red-500", sats: "0/0", quality: "0%" };
    if (acc < 10) return { text: "SIG: EXCELLENT", color: "text-green-500", sats: "14/22", quality: "98%" };
    if (acc < 30) return { text: "SIG: GOOD", color: "text-yellow-500", sats: "9/18", quality: "75%" };
    return { text: "SIG: POOR", color: "text-orange-500", sats: "4/15", quality: "32%" };
  };

  if (status === SystemStatus.STANDBY) {
    return (
      <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/90 px-4">
        <div className="text-center p-6 border-2 border-[#00ff00] bg-black shadow-[0_0_20px_rgba(0,255,0,0.5)] w-full max-w-sm">
          <h1 className="text-2xl font-bold mb-4 tracking-widest uppercase">Tactical Radar HUD</h1>
          <button onClick={onStart} className="w-full py-4 bg-[#00ff00] text-black font-bold uppercase pointer-events-auto active:scale-95 transition-all">
            System Initialization
          </button>
        </div>
      </div>
    );
  }

  const gpsStatus = getAccuracyStatus(accuracy);

  return (
    <div className="fixed inset-0 z-[1500] pointer-events-none p-4 flex flex-col justify-between font-mono text-[#00ff00]">
      
      {/* REAL-TIME ALERT POPUP */}
      {realTimeAlert && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[90%] max-w-lg bg-red-600 text-white p-4 border-4 border-white shadow-[0_0_50px_rgba(255,0,0,0.8)] animate-pulse z-[3000] pointer-events-auto">
          <div className="text-center">
            <div className="text-2xl font-black mb-1">DANGER - RED ALERT</div>
            <div className="text-xl font-bold border-y border-white py-1">{realTimeAlert.area}</div>
            <div className="text-sm mt-1 uppercase tracking-tighter flex items-center justify-center gap-2">
              {realTimeAlert.type} | {realTimeAlert.time}
              {realTimeAlert.sourceUrl && (
                <a href={realTimeAlert.sourceUrl} target="_blank" rel="noreferrer" className="underline text-[10px] opacity-80 hover:opacity-100">[VERIFY]</a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* HUD HEADER */}
      <div className="space-y-2">
        <div className="flex justify-between items-start">
          <div className="bg-black/80 border-l-2 border-t-2 border-[#00ff00] p-2 backdrop-blur-sm">
            <div className="text-[10px] opacity-60">UTC TIME</div>
            <div className="text-xl font-bold tracking-tighter leading-none">
              {now.toLocaleTimeString('en-GB', { hour12: false })}
            </div>
            {/* GPS Diagnostic */}
            <div className="mt-2 pt-1 border-t border-[#00ff00]/20 min-w-[100px]">
              <div className={`text-[8px] font-bold ${gpsStatus.color}`}>{gpsStatus.text}</div>
              <div className="text-[7px] opacity-60">SATS LOCKED: {gpsStatus.sats}</div>
              <div className="text-[7px] opacity-60">QUALITY: {gpsStatus.quality}</div>
              <div className="text-[7px] opacity-60">UNCERTAINTY: {accuracy ? `${accuracy.toFixed(1)}m` : "---"}</div>
            </div>
          </div>

          <div className="bg-black/80 border-r-2 border-t-2 border-[#00ff00] p-2 text-right flex flex-col items-end backdrop-blur-sm pointer-events-auto">
            <div className="flex gap-1 mb-2">
              <button 
                onClick={() => setShowHistory(true)}
                className="px-2 py-1 border border-[#00ff00] text-[8px] font-bold uppercase hover:bg-[#00ff00] hover:text-black transition-all"
              >
                Alert History
              </button>
              <button 
                onClick={onToggleLock} 
                className={`px-3 py-1 border text-[10px] font-bold uppercase transition-colors ${mapLocked ? 'bg-[#00ff00] text-black border-[#00ff00]' : 'bg-black text-[#00ff00] border-[#00ff00]'}`}
              >
                {mapLocked ? 'LOCK_ON' : 'FREE_SCAN'}
              </button>
            </div>
            <div className="text-[10px] opacity-60">HEADING</div>
            <div className="text-sm font-bold">{Math.round(heading)}° N</div>
            <div className="text-[8px] opacity-40 mt-1">POS: {userLocation?.lat.toFixed(4)}, {userLocation?.lng.toFixed(4)}</div>
          </div>
        </div>

        {/* ALERTS TICKER */}
        <div className="w-full bg-red-950/40 border-y border-red-500/50 py-1 overflow-hidden whitespace-nowrap">
          <div className="inline-block animate-marquee uppercase text-[10px] font-bold text-red-500">
            {hfcAlerts.length > 0 
              ? hfcAlerts.map(a => `[ ALERT: ${a.type} - ${a.area} ]`).join(' — ')
              : ">>> MONITORING LIVE STREAMS — NO ACTIVE THREATS IN SECTOR <<<"}
          </div>
        </div>
      </div>

      {/* ALERT HISTORY PANEL */}
      {showHistory && (
        <div className="fixed inset-0 bg-black/95 z-[4000] pointer-events-auto flex flex-col p-6 animate-fade-in border-4 border-[#00ff00]/20">
          <div className="flex justify-between items-center border-b border-[#00ff00] pb-4 mb-4">
            <div className="flex flex-col">
              <span className="text-2xl font-black tracking-widest text-[#00ff00]">>>> VERIFIED_HISTORY</span>
              <span className="text-[10px] opacity-60">SOURCED FROM HOME FRONT COMMAND (PIKUD HAOREF)</span>
            </div>
            <div className="flex gap-2">
              <button onClick={onRefreshHistory} className={`px-4 py-2 border border-[#00ff00] text-xs uppercase ${isScanning ? 'opacity-50' : 'hover:bg-[#00ff00] hover:text-black'}`}>
                {isScanning ? 'SYNCING...' : 'FORCE SYNC'}
              </button>
              <button onClick={() => setShowHistory(false)} className="px-4 py-2 bg-red-900/50 border border-red-500 text-red-500 text-xs font-bold hover:bg-red-500 hover:text-white">CLOSE</button>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-4">
            {alertHistory.length === 0 && <div className="text-center py-20 opacity-30 text-xl">SCANNING DATABASE...</div>}
            {alertHistory.map((alert) => (
              <div key={alert.id} className="bg-[#00ff00]/5 border-l-4 border-[#00ff00] p-4 flex justify-between items-center group hover:bg-[#00ff00]/10 transition-all">
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-bold text-[#00ff00]">{alert.area}</span>
                    {alert.sourceUrl && (
                      <a href={alert.sourceUrl} target="_blank" rel="noreferrer" title="Click to verify source" className="opacity-40 hover:opacity-100 transition-opacity">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
                      </a>
                    )}
                  </div>
                  <span className="text-[10px] opacity-70 uppercase tracking-widest">{alert.type}</span>
                </div>
                <div className="text-right flex flex-col">
                  <span className="text-lg font-mono font-bold">{alert.time}</span>
                  <span className="text-[10px] opacity-50">{alert.date}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-2 border-t border-[#00ff00]/10 text-[9px] opacity-40 text-center uppercase tracking-widest">
            Tactical simulation data provided for visualization only. Always rely on official HFC devices.
          </div>
        </div>
      )}

      {/* MODAL INTEL */}
      {intelReport && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[94%] max-w-md bg-black/95 border-2 border-[#00ff00] p-4 pointer-events-auto backdrop-blur-xl z-[2500] shadow-[0_0_40px_rgba(0,255,0,0.2)]">
          <div className="flex justify-between items-center mb-3 border-b border-[#00ff00]/50 pb-2">
            <span className="font-bold text-lg tracking-widest animate-pulse">>>> SCAN_REPORT</span>
            <button onClick={onCloseIntel} className="text-xl px-2">✕</button>
          </div>
          <div className={`text-xs leading-relaxed max-h-[30vh] overflow-y-auto custom-scrollbar pr-2 ${showTranslated ? 'text-right font-sans' : 'font-mono'}`} dir={showTranslated ? 'rtl' : 'ltr'}>
            {intelReport.loading ? <div className="animate-pulse">PROCESSING DATA STREAM...</div> : <div>{showTranslated ? intelReport.translatedText : intelReport.text}</div>}
          </div>
          
          <div className="mt-4 flex flex-col gap-2">
            <div className="flex gap-2">
              {!intelReport.loading && <button onClick={() => { if(!intelReport.translatedText) onTranslateIntel(); else setShowTranslated(!showTranslated); }} className="px-2 py-1 border text-[9px] uppercase hover:bg-[#00ff00] hover:text-black transition-all">Translate</button>}
            </div>
            {intelReport.sources && intelReport.sources.length > 0 && (
              <div className="text-[8px] opacity-40 mt-2 truncate">
                SOURCE: <a href={intelReport.sources[0]?.web?.uri} target="_blank" rel="noreferrer" className="underline">{intelReport.sources[0]?.web?.uri}</a>
              </div>
            )}
          </div>
        </div>
      )}

      {/* FOOTER TARGETS */}
      <div className="flex flex-col gap-2 w-full max-w-[320px] pointer-events-auto">
        <div className="bg-black/85 border-l-2 border-[#00ff00] p-2 backdrop-blur-md">
          <div className="text-[10px] font-bold border-b border-[#00ff00]/30 mb-2">TARGET MONITORING</div>
          <div className="space-y-1.5 max-h-[20vh] overflow-y-auto custom-scrollbar">
            {threats.sort((a,b) => (a.distance||0)-(b.distance||0)).map(t => (
              <div key={t.id} className="flex justify-between items-center py-1 border-b border-[#00ff00]/5 last:border-0">
                <div className="flex flex-col">
                  <span className="text-[9px] font-bold truncate uppercase" style={{ color: getRiskColor(t.riskLevel) }}>{t.name}</span>
                  <span className="text-[7px] opacity-70 tracking-tight">{t.location.lat.toFixed(2)}N, {t.location.lng.toFixed(2)}E</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[8px] opacity-70 font-bold">{t.distance?.toFixed(0)} KM</span>
                  <button onClick={() => onAnalyze(t)} className="px-1.5 py-0.5 border border-[#00ff00] text-[7px] hover:bg-[#00ff00] hover:text-black transition-all">INTEL</button>
                </div>
              </div>
            ))}
          </div>
        </div>
        {error && <div className="bg-red-950/80 text-red-500 p-1 text-[8px] uppercase border border-red-500 animate-pulse">{error}</div>}
      </div>
      <style>{`
        @keyframes fade-in { from { opacity: 0; transform: scale(1.02); } to { opacity: 1; transform: scale(1); } }
        .animate-fade-in { animation: fade-in 0.2s ease-out forwards; }
        .custom-scrollbar::-webkit-scrollbar { width: 3px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #00ff00; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(0,255,0,0.05); }
      `}</style>
    </div>
  );
};

export default RadarUI;
