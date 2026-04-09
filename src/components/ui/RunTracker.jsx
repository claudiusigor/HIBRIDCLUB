import React from 'react';

export default function RunTracker() {
  return (
    <div className="relative overflow-hidden bg-[#0a0a0a] border border-[#1A1A1A] h-48 md:h-64 basis-full">
      
      {/* Fake Mapbox Dark Layer */}
      <div className="absolute inset-0 opacity-40 bg-[url('https://api.mapbox.com/styles/v1/mapbox/dark-v11/static/-46.6333,-23.5505,13,0/800x400?access_token=none')] bg-cover bg-center grayscale mix-blend-luminosity filter blur-[1px]"></div>
      
      {/* Grid Guide SVG */}
      <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.1) 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
      
      {/* Neon Glow Line Tracker (SVG simulated path) */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 400 200" preserveAspectRatio="none">
        <path d="M 0,150 Q 100,120 150,80 T 300,50 Q 350,70 400,20" fill="none" stroke="#00E5FF" strokeWidth="3" className="drop-shadow-[0_0_10px_rgba(0,229,255,0.8)]" />
        
        {/* Current Position Marker */}
        <circle cx="300" cy="50" r="4" fill="#0D0D0D" stroke="#00E5FF" strokeWidth="2" className="animate-pulse" />
      </svg>
      
      {/* Top right floating metric */}
      <div className="absolute top-4 right-4 bg-[#0D0D0D] border border-white/5 py-2 px-4 shadow-[0_4px_24px_rgba(0,0,0,0.8)]">
        <div className="font-mono text-cyan-400 text-xs uppercase tracking-widest mb-1 opacity-70">Current Pace</div>
        <div className="font-bold text-xl font-mono text-white flex items-baseline gap-1">
          4:25<span className="text-[10px] text-white/40 uppercase">/km</span>
        </div>
      </div>
      
      {/* Bottom info bar - Cyberpunk aesthetic */}
      <div className="absolute bottom-0 w-full border-t border-cyan-500/20 bg-[#0D0D0D]/90 backdrop-blur-sm p-4 flex justify-between items-center">
        <div className="flex gap-6">
          <div className="flex flex-col">
            <span className="text-[9px] text-white/30 font-mono uppercase">Dist</span>
            <span className="text-sm font-mono font-bold">5.2 <span className="text-[10px] text-white/40">KM</span></span>
          </div>
          <div className="flex flex-col">
            <span className="text-[9px] text-white/30 font-mono uppercase">BPM</span>
            <span className="text-sm font-mono font-bold text-rose-500">142</span>
          </div>
        </div>
        
        <button className="h-8 w-8 flex items-center justify-center bg-cyan-500 text-black hover:bg-cyan-400 transition-colors">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 3l14 9-14 9V3z"/></svg>
        </button>
      </div>

    </div>
  );
}
