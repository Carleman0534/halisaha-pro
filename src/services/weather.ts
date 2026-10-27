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

// Common Turkish districts & cities coordinate lookup for instant resolution
const TURKEY_LOCATIONS: Record<string, { lat: number; lon: number; label: string }> = {
  basaksehir: { lat: 41.0947, lon: 28.802, label: 'Başakşehir / İstanbul' },
  olimpiyat: { lat: 41.0745, lon: 28.7656, label: 'Başakşehir / İstanbul' },
  kadikoy: { lat: 40.9903, lon: 29.0292, label: 'Kadıköy / İstanbul' },
  atasehir: { lat: 40.9833, lon: 29.1167, label: 'Ataşehir / İstanbul' },
  umraniye: { lat: 41.0167, lon: 29.1167, label: 'Ümraniye / İstanbul' },
  uskudar: { lat: 41.025, lon: 29.015, label: 'Üsküdar / İstanbul' },
  maltepe: { lat: 40.935, lon: 29.155, label: 'Maltepe / İstanbul' },
  kartal: { lat: 40.8886, lon: 29.1856, label: 'Kartal / İstanbul' },
  pendik: { lat: 40.8775, lon: 29.2336, label: 'Pendik / İstanbul' },
  tuzla: { lat: 40.8161, lon: 29.3006, label: 'Tuzla / İstanbul' },
  gebze: { lat: 40.8028, lon: 29.4307, label: 'Gebze / Kocaeli' },
  cayirova: { lat: 40.825, lon: 29.373, label: 'Çayırova / Kocaeli' },
  darica: { lat: 40.7739, lon: 29.4003, label: 'Darıca / Kocaeli' },
  izmit: { lat: 40.7654, lon: 29.9408, label: 'İzmit / Kocaeli' },
  kocaeli: { lat: 40.7654, lon: 29.9408, label: 'Kocaeli' },
  besiktas: { lat: 41.0422, lon: 29.0067, label: 'Beşiktaş / İstanbul' },
  sisli: { lat: 41.0605, lon: 28.9872, label: 'Şişli / İstanbul' },
  kagithane: { lat: 41.0811, lon: 28.9725, label: 'Kağıthane / İstanbul' },
  sariyer: { lat: 41.1667, lon: 29.05, label: 'Sarıyer / İstanbul' },
  fatih: { lat: 41.0186, lon: 28.9397, label: 'Fatih / İstanbul' },
  zeytinburnu: { lat: 40.9942, lon: 28.9044, label: 'Zeytinburnu / İstanbul' },
  bakirkoy: { lat: 40.9801, lon: 28.872, label: 'Bakırköy / İstanbul' },
  bahcelievler: { lat: 41.0017, lon: 28.8597, label: 'Bahçelievler / İstanbul' },
  bagcilar: { lat: 41.0344, lon: 28.8564, label: 'Bağcılar / İstanbul' },
  kucukcekmece: { lat: 41.0003, lon: 28.78, label: 'Küçükçekmece / İstanbul' },
  avcilar: { lat: 40.9792, lon: 28.7214, label: 'Avcılar / İstanbul' },
  esenyurt: { lat: 41.0342, lon: 28.6803, label: 'Esenyurt / İstanbul' },
  beylikduzu: { lat: 41.0011, lon: 28.6419, label: 'Beylikdüzü / İstanbul' },
  eyupsultan: { lat: 41.0478, lon: 28.9333, label: 'Eyüpsultan / İstanbul' },
  gaziosmanpasa: { lat: 41.0578, lon: 28.9122, label: 'Gaziosmanpaşa / İstanbul' },
  esenler: { lat: 41.0436, lon: 28.8758, label: 'Esenler / İstanbul' },
  sultangazi: { lat: 41.1069, lon: 28.8672, label: 'Sultangazi / İstanbul' },
  sancaktepe: { lat: 41.0022, lon: 29.2319, label: 'Sancaktepe / İstanbul' },
  cekmekoy: { lat: 41.0339, lon: 29.1764, label: 'Çekmeköy / İstanbul' },
  beykoz: { lat: 41.1258, lon: 29.0975, label: 'Beykoz / İstanbul' },
  ankara: { lat: 39.9334, lon: 32.8597, label: 'Ankara' },
  izmir: { lat: 38.4237, lon: 27.1428, label: 'İzmir' },
  bursa: { lat: 40.1885, lon: 29.061, label: 'Bursa' },
  antalya: { lat: 36.8969, lon: 30.7133, label: 'Antalya' },
  sakarya: { lat: 40.7569, lon: 30.3783, label: 'Sakarya' },
};

function normalizeTr(str: string): string {
  return str
    .toLowerCase()
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c');
}

async function resolveVenueCoordinates(
  venueName: string,
  venueLocation?: string
): Promise<{ lat: number; lon: number; displayCity: string }> {
  const combined = `${venueLocation || ''} ${venueName || ''}`.trim();

  // 1. Check if venueLocation or venueName contains raw coordinates (e.g. "40.8028, 29.4307" or "@40.8028,29.4307")
  const coordMatch = combined.match(/(-?\d{1,2}\.\d{3,})[\s,]+(-?\d{1,3}\.\d{3,})/);
  if (coordMatch) {
    const lat = parseFloat(coordMatch[1]);
    const lon = parseFloat(coordMatch[2]);
    if (!isNaN(lat) && !isNaN(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180) {
      return {
        lat,
        lon,
        displayCity: venueName || `${lat.toFixed(3)}, ${lon.toFixed(3)}`,
      };
    }
  }

  // 2. Check known Turkish districts / cities in normalized string
  const norm = normalizeTr(combined);
  for (const [key, info] of Object.entries(TURKEY_LOCATIONS)) {
    if (norm.includes(key)) {
      const displayCity =
        venueName && !normalizeTr(venueName).includes(key)
          ? `${venueName} (${info.label})`
          : venueLocation && venueLocation !== venueName && !venueLocation.startsWith('http')
          ? `${venueName} • ${venueLocation}`
          : `${venueName || info.label}`;
      return { lat: info.lat, lon: info.lon, displayCity };
    }
  }

  // 3. Try Open-Meteo Geocoding API for any custom location string
  const searchCandidates: string[] = [];
  if (venueLocation && !venueLocation.startsWith('http')) {
    searchCandidates.push(venueLocation.trim());
    // Also push parts separated by comma or slash (e.g. "Merkez Mah, Gaziosmanpaşa / İstanbul")
    venueLocation
      .split(/[,/\-()]/)
      .map(s => s.trim())
      .filter(s => s.length >= 3)
      .reverse()
      .forEach(part => searchCandidates.push(part));
  }
  if (venueName) {
    searchCandidates.push(venueName.trim());
  }

  for (const query of searchCandidates) {
    try {
      const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
        query
      )}&count=1&language=tr&format=json`;
      const res = await fetch(geoUrl);
      if (res.ok) {
        const geoData = await res.json();
        if (geoData.results && geoData.results.length > 0) {
          const hit = geoData.results[0];
          const region = hit.admin1 ? `${hit.name} / ${hit.admin1}` : hit.name;
          return {
            lat: hit.latitude,
            lon: hit.longitude,
            displayCity: venueName ? `${venueName} (${region})` : region,
          };
        }
      }
    } catch {}
  }

  // 4. Default fallback (İstanbul / Gebze)
  const fallbackDisplay =
    venueLocation && venueLocation !== venueName && !venueLocation.startsWith('http')
      ? `${venueName} (${venueLocation})`
      : venueName || 'İstanbul / Gebze';
  return { lat: 41.01, lon: 28.97, displayCity: fallbackDisplay };
}

export async function fetchLiveWeather(
  venueName = 'Olimpiyat Halı Saha Tesisleri',
  lat = 41.01,
  lon = 28.97,
  matchDate?: string,
  matchTime?: string,
  venueLocation?: string
): Promise<MatchWeather> {
  const startHour =
    (matchTime || '21:00')
      .split('-')[0]
      .trim()
      .split(':')[0]
      ?.trim()
      .padStart(2, '0') || '21';
  const cleanDate = (matchDate || '').split('T')[0] || 'today';
  const locKey = normalizeTr(`${venueName}_${venueLocation || ''}`).replace(/[^a-z0-9]/g, '_');
  const cacheKey = `halisaha_weather_v2_${locKey}_${cleanDate}_${startHour}`;

  // Check cache (valid for 20 minutes)
  try {
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Date.now() - parsed.timestamp < 20 * 60 * 1000) {
        return parsed.data;
      }
    }
  } catch {}

  const resolved = await resolveVenueCoordinates(venueName, venueLocation);
  const targetLat = resolved.lat || lat;
  const targetLon = resolved.lon || lon;
  const displayCity = `${resolved.displayCity} • Saat ${startHour}:00`;

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${targetLat}&longitude=${targetLon}&current=temperature_2m,relative_humidity_2m,precipitation,weather_code,wind_speed_10m&hourly=temperature_2m,precipitation_probability,weather_code,wind_speed_10m&forecast_days=16&timezone=auto`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Weather fetch failed: ${res.status}`);

    const data: OpenMeteoResponse = await res.json();

    let temp = Math.round(data.current?.temperature_2m ?? 18);
    let code = data.current?.weather_code ?? 2;
    let wind = Math.round(data.current?.wind_speed_10m ?? 10);
    let rainProb = 0;

    // Match the exact date and match start hour (e.g. 2026-10-30T21:00), or fallback to the same start hour (T21:00) on the closest forecast day
    if (data.hourly && data.hourly.time && data.hourly.time.length > 0) {
      const exactPrefix = `${cleanDate}T${startHour}:00`;
      let idx = data.hourly.time.findIndex(t => t.startsWith(exactPrefix));

      if (idx === -1) {
        // Fallback to the match's start hour on the available forecast day
        const hourSuffix = `T${startHour}:00`;
        idx = data.hourly.time.findIndex(t => t.endsWith(hourSuffix));
      }

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
      city: displayCity,
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
      city: displayCity,
      isSimulated: true,
    };
  }
}
