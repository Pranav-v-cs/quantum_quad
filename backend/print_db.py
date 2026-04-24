import sqlite3
from pathlib import Path


def main():
    db_path = Path(__file__).resolve().parent / "data" / "telemetry.db"
    if not db_path.exists():
        print(f"Database not found: {db_path}")
        return

    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row

    try:
        rows = conn.execute(
            """
            SELECT id, station_id, temperature, turbidity, ph, tds, dissolved_oxygen, source, created_at
            FROM telemetry
            ORDER BY id DESC
            """
        ).fetchall()
    except sqlite3.OperationalError as err:
        print(f"Query failed: {err}")
        return
    finally:
        conn.close()

    if not rows:
        print("No rows found.")
        return

    for row in rows:
        print(
            f"[{row['id']}] station={row['station_id']} "
            f"temp={row['temperature']} turb={row['turbidity']} ph={row['ph']} "
            f"tds={row['tds']} do={row['dissolved_oxygen']} "
            f"source={row['source']} at={row['created_at']}"
        )


if __name__ == "__main__":
    main()
