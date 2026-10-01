import duckdb
import json
import sys

sys.stdout.reconfigure(encoding="utf-8")

con = duckdb.connect()
con.execute("INSTALL httpfs; LOAD httpfs;")
url = "https://huggingface.co/datasets/Placekey/FOURSQUARE_OPEN_SOURCE_PLACES_x_OVERTURE_INNER_JOIN/resolve/main/data.snappy.parquet"

query = """
SELECT 
    Overture_country,
    count(*) as total,
    count(Overture_phones) as overture_has_phone,
    count("Foursquare Open Source Places_tel") as fsq_has_phone
FROM parquet_scan(?)
WHERE Overture_country IN ('EG', 'AE', 'SA', 'KW', 'QA', 'BH', 'OM')
GROUP BY Overture_country
ORDER BY total DESC
"""

print("Executing query on remote Placekey parquet...")
res = con.execute(query, [url]).fetchall()
print("Counts with phones:")
for row in res:
    print(row)
