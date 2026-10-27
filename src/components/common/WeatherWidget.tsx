import React, { useState, useEffect } from 'react';
import {
  Sun,
  CloudSun,
  Cloud,
  CloudRain,
  CloudLightning,
  Snowflake,
  Wind,
  Droplets,
  RefreshCw,
  Sparkles,
  MapPin,
} from 'lucide-react';
import { MatchWeather } from '../../types';
import { fetchLiveWeather } from '../../services/weather';

interface WeatherWidgetProps {
  matchDate?: string;
  matchTime?: string;
  venueName?: string;
  venueLocation?: string;
}

export const WeatherWidget: React.FC<WeatherWidgetProps> = ({
  matchDate,
  matchTime,
  venueName,
  venueLocation,
}) => {
  const [weather, setWeather] = useState<MatchWeather | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const loadWeather = async () => {
    setIsLoading(true);
    try {
      const data = await fetchLiveWeather(
        venueName || 'Olimpiyat Halı Saha Tesisleri',
        41.01,
        28.97,
        matchDate,
        matchTime,
        venueLocation
      );
      setWeather(data);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadWeather();
  }, [matchDate, matchTime, venueName, venueLocation]);

  const renderWeatherIcon = (iconName: string) => {
    switch (iconName) {
      case 'sun':
        return <Sun className="w-8 h-8 text-amber-400 animate-spin-slow" />;
      case 'rain':
        return <CloudRain className="w-8 h-8 text-blue-400 animate-bounce" />;
      case 'storm':
        return <CloudLightning className="w-8 h-8 text-purple-400" />;
      case 'snow':
        return <Snowflake className="w-8 h-8 text-cyan-200" />;
      case 'cloud':
        return <Cloud className="w-8 h-8 text-slate-300" />;
      case 'cloud-sun':
      default:
        return <CloudSun className="w-8 h-8 text-amber-300" />;
    }
  };

  if (!weather) return null;

  return (
    <div className="p-3.5 rounded-2xl bg-gradient-to-r from-sky-950/40 via-slate-900 to-slate-900 border border-sky-500/30 shadow-lg space-y-2.5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="w-7 h-7 rounded-xl bg-sky-500/20 text-sky-400 border border-sky-500/30 flex items-center justify-center">
            <CloudSun className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <h4 className="text-xs font-black text-white uppercase tracking-wider">
                Maç Saati Hava Durumu
              </h4>
              <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-sky-500/20 text-sky-300 font-bold border border-sky-500/30">
                Canlı Tahmin
              </span>
            </div>
            <span className="text-[10px] text-slate-400 flex items-center space-x-1">
              <MapPin className="w-3 h-3 text-rose-400" />
              <span>{weather.city}</span>
            </span>
          </div>
        </div>

        <button
          onClick={loadWeather}
          disabled={isLoading}
          title="Hava Durumunu Yenile"
          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 transition-all active:scale-95"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-sky-400' : ''}`} />
        </button>
      </div>

      {/* Main Temperature & Stats */}
      <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/70 border border-slate-800">
        <div className="flex items-center space-x-3">
          {renderWeatherIcon(weather.icon)}
          <div>
            <div className="flex items-baseline space-x-1">
              <span className="text-2xl font-black text-white font-mono leading-none">
                {weather.temperature}°
              </span>
              <span className="text-xs font-bold text-slate-300">C</span>
            </div>
            <span className="text-xs font-semibold text-sky-300 block mt-0.5">
              {weather.condition}
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-3 text-right">
          <div className="text-[11px] space-y-0.5">
            <div className="flex items-center justify-end space-x-1 text-slate-300">
              <Droplets className="w-3.5 h-3.5 text-blue-400" />
              <span>Yağmur: <strong className="text-white">%{weather.rainProbability}</strong></span>
            </div>
            <div className="flex items-center justify-end space-x-1 text-slate-400">
              <Wind className="w-3.5 h-3.5 text-teal-400" />
              <span>Rüzgar: <strong className="text-slate-200">{weather.windSpeed} km/s</strong></span>
            </div>
          </div>
        </div>
      </div>

      {/* Equipment & Clothing Advice Box */}
      <div className="p-2 rounded-xl bg-slate-950/50 border border-slate-800/80 text-[11px] text-slate-300 flex items-start space-x-1.5">
        <span className="shrink-0 text-amber-400">💡</span>
        <span className="leading-snug">
          <strong>Halı Saha Tavsiyesi:</strong> {weather.recommendation}
        </span>
      </div>
    </div>
  );
};
