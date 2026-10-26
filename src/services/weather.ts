import { MatchWeather } from '../types';

interface OpenMeteoResponse {
  current?: {
    temperature_2m: number;
    relative_humidity_2m: number;
    precipitation: number;
    weather_code: number;
    wind_speed_10m: number;
  };
  hourly?: {
    time: string[];
    temperature_2m: number[];
    precipitation_probability: number[];
    weather_code: number[];
    wind_speed_10m: number[];
  };
}

export function getWeatherConditionInfo(code: number): { condition: string; icon: string } {
  switch (code) {
    case 0:
      return { condition: 'Açık & Güneşli', icon: 'sun' };
    case 1:
      return { condition: 'Çoğunlukla Açık', icon: 'cloud-sun' };
    case 2:
      return { condition: 'Parçalı Bulutlu', icon: 'cloud-sun' };
    case 3:
      return { condition: 'Kapalı / Bulutlu', icon: 'cloud' };
    case 45:
    case 48:
      return { condition: 'Sisli', icon: 'cloud' };
    case 51:
    case 53:
    case 55:
      return { condition: 'Çiseleyen Yağmur', icon: 'rain' };
    case 61:
    case 63:
    case 65:
      return { condition: 'Yağmurlu', icon: 'rain' };
    case 71:
    case 73:
    case 75:
      return { condition: 'Karlı', icon: 'snow' };
    case 80:
    case 81:
    case 82:
      return { condition: 'Sağanak Yağışlı', icon: 'rain' };
    case 95:
    case 96:
    case 99:
      return { condition: 'Gök Gürültülü Fırtına', icon: 'storm' };
    default:
      return { condition: 'Parçalı Bulutlu', icon: 'cloud-sun' };
  }
}

export function generateClothingAdvice(temp: number, rainProb: number, condition: string): string {
  if (rainProb >= 50 || condition.toLowerCase().includes('yağmur') || condition.toLowerCase().includes('sağanak')) {
    return '🌧️ Yağmur ihtimali yüksek: Yağmurluk ve halı saha kauçuk tabanlı krampon tercih edin.';
  }
  if (temp < 10) {
    return '❄️ Hava oldukça serin: Termal içlik, eldiven ve maç öncesi iyi ısınma şart!';
  }
  if (temp < 16) {
    return '🧣 Hava ılık-serin: Termal üst veya uzun kollu forma ve yedek tişört önerilir.';
  }
  if (temp > 25) {
    return '☀️ Sıcak hava: Bol su tüketin, hafif ve nefes alan forma giyin.';
  }
  return '⚽ Harika futbol havası! Kısa kollu forma ve standart krampon uygundur.';
}

export async function fetchLiveWeather(
  city = 'İstanbul / Gebze',
  lat = 40.80,
  lon = 29.43,
  matchDate?: string,
  matchTime?: string
): Promise<MatchWeather> {
  const cacheKey = `halisaha_weather_${lat.toFixed(2)}_${lon.toFixed(2)}_${matchDate || 'today'}`;

  // Check cache (valid for 30 minutes)
  try {
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Date.now() - parsed.timestamp < 30 * 60 * 1000) {
        return parsed.data;
      }
    }
  } catch {}

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,precipitation,weather_code,wind_speed_10m&hourly=temperature_2m,precipitation_probability,weather_code,wind_speed_10m&timezone=auto`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Weather fetch failed: ${res.status}`);

    const data: OpenMeteoResponse = await res.json();

    let temp = Math.round(data.current?.temperature_2m ?? 18);
    let code = data.current?.weather_code ?? 2;
    let wind = Math.round(data.current?.wind_speed_10m ?? 10);
    let rainProb = 0;

    // If matchDate and matchTime provided, try to find matching hour in hourly forecast
    if (matchDate && matchTime && data.hourly && data.hourly.time) {
      const hourStr = matchTime.split(':')[0]?.padStart(2, '0') || '21';
      const targetTimePrefix = `${matchDate}T${hourStr}:00`;
      const idx = data.hourly.time.findIndex(t => t.startsWith(targetTimePrefix));

      if (idx !== -1) {
        temp = Math.round(data.hourly.temperature_2m[idx] ?? temp);
        code = data.hourly.weather_code[idx] ?? code;
        rainProb = Math.round(data.hourly.precipitation_probability[idx] ?? 0);
        wind = Math.round(data.hourly.wind_speed_10m[idx] ?? wind);
      }
    }

    const { condition, icon } = getWeatherConditionInfo(code);
    const recommendation = generateClothingAdvice(temp, rainProb, condition);

    const weatherResult: MatchWeather = {
      temperature: temp,
      condition,
      icon,
      rainProbability: rainProb,
      windSpeed: wind,
      recommendation,
      city,
    };

    // Cache result
    try {
      localStorage.setItem(
        cacheKey,
        JSON.stringify({ timestamp: Date.now(), data: weatherResult })
      );
    } catch {}

    return weatherResult;
  } catch (err) {
    console.warn('Live weather fallback used:', err);
    // Offline / fallback response
    return {
      temperature: 17,
      condition: 'Parçalı Bulutlu',
      icon: 'cloud-sun',
      rainProbability: 10,
      windSpeed: 12,
      recommendation: '⚽ İdeal futbol havası! Halı saha kramponu ve standart forma uygundur.',
      city,
      isSimulated: true,
    };
  }
}
