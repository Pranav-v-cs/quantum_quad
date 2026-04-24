#!/usr/bin/env python3
import argparse
import json
import re
import time

import requests
import serial

DEFAULT_PORT = "/dev/cu.usbserial-0001"


def parse_args():
    parser = argparse.ArgumentParser(description="Read GPS JSON from serial and post to backend.")
    parser.add_argument(
        "--port",
        default=DEFAULT_PORT,
        help=f"Serial port (default: {DEFAULT_PORT})",
    )
    parser.add_argument("--baud", type=int, default=9600, help="Serial baud rate")
    parser.add_argument(
        "--api",
        default="http://localhost:9999/api/gps",
        help="Backend GPS endpoint",
    )
    return parser.parse_args()


def parse_line(line):
    payload = json.loads(line)
    lat = float(payload["lat"])
    lng = float(payload["lng"])
    if not (-90 <= lat <= 90):
        raise ValueError("lat out of range")
    if not (-180 <= lng <= 180):
        raise ValueError("lng out of range")
    return {"lat": lat, "lng": lng, "raw_line": line}


def parse_lat_lng_value(line, key):
    match = re.search(rf"{key}\s*:\s*(-?\d+(?:\.\d+)?)", line, flags=re.IGNORECASE)
    if not match:
        return None
    return float(match.group(1))


def main():
    args = parse_args()
    print(f"Opening serial port {args.port} @ {args.baud}")
    pending_lat = None
    pending_raw = []
    with serial.Serial(args.port, args.baud, timeout=1) as ser:
        while True:
            try:
                line = ser.readline().decode("utf-8", errors="ignore").strip()
                if not line:
                    continue
                data = None
                try:
                    # Preferred format: {"lat":11.016844,"lng":76.955833}
                    data = parse_line(line)
                except Exception:
                    # Fallback format:
                    # Latitude: 11.016844
                    # Longitude: 76.955833
                    lat = parse_lat_lng_value(line, "Latitude")
                    lng = parse_lat_lng_value(line, "Longitude")
                    if lat is not None:
                        pending_lat = lat
                        pending_raw = [line]
                    elif lng is not None and pending_lat is not None:
                        data = {"lat": pending_lat, "lng": lng, "raw_line": " | ".join([*pending_raw, line])}
                        pending_lat = None
                        pending_raw = []
                    else:
                        continue

                response = requests.post(args.api, json=data, timeout=3)
                response.raise_for_status()
                body = response.json()
                gps = body.get("gps") or {}
                print(f"sent lat={gps.get('lat')} lng={gps.get('lng')} at {gps.get('created_at')}")
            except KeyboardInterrupt:
                print("\nStopped.")
                break
            except Exception as exc:
                print(f"skip: {exc}")
                time.sleep(0.2)


if __name__ == "__main__":
    main()
