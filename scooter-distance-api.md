# Scooter Total Distance API

Returns the total distance traveled across all scooters, sourced from Snowflake and cached in Redis. Public reads, manually-triggered (throttled) refresh.

---

## `GET /api/scooters/total-distance`

Returns the current cached total distance. Public — no authentication required.

**Auth:** None
**Body:** None

### Response `200 OK`
```json
{
  "totalDistanceKm": 4334,
  "lastRefreshed": "Aug 14, 2026, 12:29:07 PM"
}
```

| Field | Type | Description |
|---|---|---|
| `totalDistanceKm` | number | Sum of distance (km) across all scooters, as of the last refresh |
| `lastRefreshed` | string | Local time (Asia/Colombo) the data was last actually pulled from Snowflake |

### Response `503 Service Unavailable`
Returned if no refresh has ever run yet (cache is empty).
```json
{ "error": "No data yet. Trigger a refresh first." }
```

### Response `500 Internal Server Error`
```json
{ "error": "Internal error" }
```

### Notes
- Never queries Snowflake — always reads from Redis. Safe to call as often as needed with no cost implications.
- `Cache-Control: public, max-age=3600` header set, so browsers/CDNs may cache the response for up to an hour.

---

## `POST /api/scooters/total-distance/refresh`

Triggers a recalculation from Snowflake and updates the cache — but only if at least **12 hours** have passed since the last real refresh. Otherwise, returns the existing cached value untouched (Snowflake is not queried).

**Auth:** Required — shared secret header
**Body:** None

### Headers
| Header | Required | Description |
|---|---|---|
| `x-refresh-secret` | Yes | Must match the `REFRESH_SECRET` env var |

### Response `200 OK`
Same shape whether the refresh actually ran or was throttled:
```json
{
  "totalDistanceKm": 4334,
  "lastRefreshed": "Aug 14, 2026, 12:29:07 PM"
}
```
- If **throttled** (called within 12h of the last real refresh): `totalDistanceKm` and `lastRefreshed` reflect the existing cache, unchanged.
- If **not throttled**: Snowflake is queried, the cache is updated, and `lastRefreshed` reflects the current time.

### Response `401 Unauthorized`
Missing or incorrect `x-refresh-secret`.
```json
{ "error": "Unauthorized" }
```

### Response `500 Internal Server Error`
Snowflake query failed (e.g. missing grant, connection issue).
```json
{ "error": "Refresh failed", "details": "..." }
```

### Notes
- Source data (`REPORT_DB.GPS_DASHBOARD.VEHICLE_DISTANCE_PUBLIC`) updates once daily as a batch job — the 12h throttle exists to avoid querying Snowflake more often than the underlying data actually changes.
- Runs as a dedicated Snowflake service account (`SCOOTER_API_SVC`), authenticated via RSA key-pair, scoped to `SELECT` on the view only — no access to the base table or any other data.

---
