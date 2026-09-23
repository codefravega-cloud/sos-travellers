import { NextResponse } from "next/server";

export const revalidate = 3600;

type WeatherKind = "clear" | "cloudy" | "fog" | "rain" | "storm" | "snow" | "night";

function weatherKind(code: number, isDay: boolean): WeatherKind {
  if (!isDay && code <= 3) return "night";
  if (code === 0) return "clear";
  if (code <= 3) return "cloudy";
  if (code === 45 || code === 48) return "fog";
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return "rain";
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return "snow";
  if (code >= 95) return "storm";
  return "cloudy";
}

export async function GET() {
  const endpoint = new URL("https://api.open-meteo.com/v1/forecast");
  endpoint.searchParams.set("latitude", "-33.4489");
  endpoint.searchParams.set("longitude", "-70.6693");
  endpoint.searchParams.set("current", "temperature_2m,apparent_temperature,weather_code,is_day,wind_speed_10m");
  endpoint.searchParams.set("daily", "temperature_2m_max,temperature_2m_min,precipitation_probability_max");
  endpoint.searchParams.set("timezone", "America/Santiago");
  endpoint.searchParams.set("forecast_days", "1");

  try {
    const response = await fetch(endpoint, { next: { revalidate: 3600 } });
    if (!response.ok) throw new Error(`Weather provider returned ${response.status}`);
    const data = await response.json();
    const current = data.current;
    const daily = data.daily;
    if (!current || !daily) throw new Error("Weather response incomplete");

    return NextResponse.json({
      temperature: Math.round(current.temperature_2m),
      apparent: Math.round(current.apparent_temperature),
      wind: Math.round(current.wind_speed_10m),
      precipitation: Math.round(daily.precipitation_probability_max?.[0] ?? 0),
      maximum: Math.round(daily.temperature_2m_max?.[0]),
      minimum: Math.round(daily.temperature_2m_min?.[0]),
      code: current.weather_code,
      isDay: Boolean(current.is_day),
      kind: weatherKind(current.weather_code, Boolean(current.is_day)),
      observedAt: current.time,
      source: "Open-Meteo",
    }, { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=1800" } });
  } catch (error) {
    console.error("Unable to load Santiago weather", error);
    return NextResponse.json({ error: "Weather unavailable" }, { status: 503 });
  }
}
