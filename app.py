#!/usr/bin/env python3
"""Simple CLI weather app with automatic location detection.

The script:
1. Detects approximate location from public IP.
2. Fetches current weather for that location.
3. Prints a concise weather summary for the user.
"""

from __future__ import annotations

import json
import sys
import urllib.error
import urllib.parse
import urllib.request


IP_GEO_URL = "https://ipapi.co/json/"
OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast"


WEATHER_CODES: dict[int, str] = {
    0: "Clear sky",
    1: "Mainly clear",
    2: "Partly cloudy",
    3: "Overcast",
    45: "Fog",
    48: "Depositing rime fog",
    51: "Light drizzle",
    53: "Moderate drizzle",
    55: "Dense drizzle",
    56: "Light freezing drizzle",
    57: "Dense freezing drizzle",
    61: "Slight rain",
    63: "Moderate rain",
    65: "Heavy rain",
    66: "Light freezing rain",
    67: "Heavy freezing rain",
    71: "Slight snow fall",
    73: "Moderate snow fall",
    75: "Heavy snow fall",
    77: "Snow grains",
    80: "Slight rain showers",
    81: "Moderate rain showers",
    82: "Violent rain showers",
    85: "Slight snow showers",
    86: "Heavy snow showers",
    95: "Thunderstorm",
    96: "Thunderstorm with slight hail",
    99: "Thunderstorm with heavy hail",
}


def fetch_json(url: str) -> dict:
    """Fetch JSON from URL and return parsed dictionary."""
    request = urllib.request.Request(
        url,
        headers={
            "User-Agent": "simple-weather-app/1.0",
            "Accept": "application/json",
        },
    )
    with urllib.request.urlopen(request, timeout=10) as response:
        payload = response.read().decode("utf-8")
    return json.loads(payload)


def detect_location() -> tuple[str, float, float]:
    """Return display name, latitude, and longitude from IP geolocation."""
    geo = fetch_json(IP_GEO_URL)

    city = geo.get("city") or "Unknown city"
    region = geo.get("region") or "Unknown region"
    country = geo.get("country_name") or "Unknown country"

    latitude = geo.get("latitude")
    longitude = geo.get("longitude")
    if latitude is None or longitude is None:
        raise ValueError("Could not determine your latitude/longitude from IP geolocation")

    location_name = f"{city}, {region}, {country}"
    return location_name, float(latitude), float(longitude)


def get_current_weather(latitude: float, longitude: float) -> tuple[float, int, float]:
    """Return current temperature (°C), weather code, and wind speed (km/h)."""
    params = urllib.parse.urlencode(
        {
            "latitude": latitude,
            "longitude": longitude,
            "current": "temperature_2m,weather_code,wind_speed_10m",
        }
    )

    data = fetch_json(f"{OPEN_METEO_URL}?{params}")
    current = data.get("current", {})

    temperature = current.get("temperature_2m")
    weather_code = current.get("weather_code")
    wind_speed = current.get("wind_speed_10m")

    if temperature is None or weather_code is None or wind_speed is None:
        raise ValueError("Weather API returned incomplete current weather data")

    return float(temperature), int(weather_code), float(wind_speed)


def main() -> None:
    print("🌤️  Welcome to the simple weather app!\n")

    try:
        location_name, latitude, longitude = detect_location()
        temperature, weather_code, wind_speed = get_current_weather(latitude, longitude)
    except (urllib.error.URLError, TimeoutError) as exc:
        print(f"Network error: {exc}")
        print("Please check your internet connection and try again.")
        sys.exit(1)
    except (ValueError, json.JSONDecodeError) as exc:
        print(f"Data error: {exc}")
        sys.exit(1)

    description = WEATHER_CODES.get(weather_code, f"Unknown weather code ({weather_code})")

    print(f"Detected location: {location_name}")
    print(f"Current weather: {description}")
    print(f"Temperature: {temperature:.1f}°C")
    print(f"Wind speed: {wind_speed:.1f} km/h")


if __name__ == "__main__":
    main()
