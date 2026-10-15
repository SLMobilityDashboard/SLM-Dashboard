#!/usr/bin/env python3
"""
Daily scooter distance report.

Reads per-scooter distance from the Snowflake view
REPORT_DB.GPS_DASHBOARD.VEHICLE_DISTANCE_PUBLIC and writes a JSON summary
(yesterday's distance + running total per scooter) to S3.

This script is READ-ONLY against Snowflake — the underlying table
(VEHICLE_DAILY_DISTANCE) is populated by a separate process. This job
just aggregates and republishes the numbers to S3 for consumption
elsewhere (dashboard, app, etc).

Auth model:
  - Snowflake: key-pair auth using a dedicated service account
    (SNOWFLAKE_SERVICE_USERNAME / SNOWFLAKE_SERVICE_ROLE), no passwords.
  - AWS: a scoped IAM access key/secret (AWS_ACCESS_KEY_ID /
    AWS_SECRET_ACCESS_KEY), read from environment variables — never
    hardcoded in this file.

Intended to run once a day via cron, e.g. 12:00 PM Asia/Colombo:
    0 12 * * * /path/to/venv/bin/python3 /path/to/daily_distance_report.py >> /path/to/logs/daily_distance_report.log 2>&1

Environment variables — Snowflake:
    SNOWFLAKE_ACCOUNT                    (default: ANGWRUH-ZI90300)
    SNOWFLAKE_SERVICE_USERNAME           (default: SCOOTER_API_SVC)
    SNOWFLAKE_SERVICE_ROLE               (default: SCOOTER_API_READER)
    SNOWFLAKE_WAREHOUSE                  (default: COMPUTE_WH)
    SNOWFLAKE_DATABASE                   (default: REPORT_DB)
    SNOWFLAKE_SCHEMA                     (default: GPS_DASHBOARD)
    SNOWFLAKE_SERVICE_PRIVATE_KEY_PATH   path to a .p8 key file
    SNOWFLAKE_SERVICE_PRIVATE_KEY        OR paste PEM contents directly
                                          (one of these two is required)
    SNOWFLAKE_SERVICE_PRIVATE_KEY_PASSPHRASE   optional, if the key is encrypted

Environment variables — AWS:
    AWS_REGION                          (default: ap-southeast-1)
    AWS_ACCESS_KEY_ID                   required — from a scoped IAM user
    AWS_SECRET_ACCESS_KEY               required — from that same IAM user

    DISTANCE_REPORT_BUCKET              (default: amzn-s3-lencar-web)
    DISTANCE_REPORT_PREFIX              (default: distance-reports)

The IAM user behind these keys should be scoped to only what this job
needs, e.g. an inline policy granting s3:PutObject on
arn:aws:s3:::amzn-s3-lencar-web/distance-reports/* — nothing broader.
Never commit these keys or paste them anywhere outside your own secrets
manager / server environment.
"""

import os
import sys
import json
import logging
from datetime import date, timedelta, datetime, timezone

import boto3
import snowflake.connector
from cryptography.hazmat.primitives import serialization

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass  # python-dotenv is optional; env vars can be set another way

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

SNOWFLAKE_ACCOUNT = os.environ.get("SNOWFLAKE_ACCOUNT", "ANGWRUH-ZI90300")
SNOWFLAKE_SERVICE_USERNAME = os.environ.get("SNOWFLAKE_SERVICE_USERNAME", "SCOOTER_API_SVC")
SNOWFLAKE_SERVICE_ROLE = os.environ.get("SNOWFLAKE_SERVICE_ROLE", "SCOOTER_API_READER")
SNOWFLAKE_WAREHOUSE = os.environ.get("SNOWFLAKE_WAREHOUSE", "COMPUTE_WH")
SNOWFLAKE_DATABASE = os.environ.get("SNOWFLAKE_DATABASE", "REPORT_DB")
SNOWFLAKE_SCHEMA = os.environ.get("SNOWFLAKE_SCHEMA", "GPS_DASHBOARD")

SNOWFLAKE_SERVICE_PRIVATE_KEY_PATH = os.environ.get("SNOWFLAKE_SERVICE_PRIVATE_KEY_PATH")
SNOWFLAKE_SERVICE_PRIVATE_KEY = os.environ.get("SNOWFLAKE_SERVICE_PRIVATE_KEY")
SNOWFLAKE_SERVICE_PRIVATE_KEY_PASSPHRASE = os.environ.get("SNOWFLAKE_SERVICE_PRIVATE_KEY_PASSPHRASE")

AWS_REGION = os.environ.get("AWS_REGION", "ap-southeast-1")
AWS_ACCESS_KEY_ID = os.environ.get("AWS_ACCESS_KEY_ID")
AWS_SECRET_ACCESS_KEY = os.environ.get("AWS_SECRET_ACCESS_KEY")

S3_BUCKET = os.environ.get("DISTANCE_REPORT_BUCKET", "amzn-s3-lencar-web")
S3_PREFIX = os.environ.get("DISTANCE_REPORT_PREFIX", "distance-reports")

VIEW_NAME = f"{SNOWFLAKE_DATABASE}.{SNOWFLAKE_SCHEMA}.VEHICLE_DISTANCE_PUBLIC"

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
log = logging.getLogger("daily_distance_report")


# ---------------------------------------------------------------------------
# Snowflake
# ---------------------------------------------------------------------------

def load_private_key_bytes():
    passphrase = SNOWFLAKE_SERVICE_PRIVATE_KEY_PASSPHRASE.encode() if SNOWFLAKE_SERVICE_PRIVATE_KEY_PASSPHRASE else None

    if SNOWFLAKE_SERVICE_PRIVATE_KEY:
        # Handle both real newlines and literal "\n" sequences (common when
        # a key is pasted into a single-line .env value).
        normalized = SNOWFLAKE_SERVICE_PRIVATE_KEY.replace("\\n", "\n")
        pem_data = normalized.encode()
    elif SNOWFLAKE_SERVICE_PRIVATE_KEY_PATH:
        with open(SNOWFLAKE_SERVICE_PRIVATE_KEY_PATH, "rb") as key_file:
            pem_data = key_file.read()
    else:
        raise RuntimeError(
            "Set either SNOWFLAKE_SERVICE_PRIVATE_KEY_PATH or "
            "SNOWFLAKE_SERVICE_PRIVATE_KEY."
        )

    p_key = serialization.load_pem_private_key(pem_data, password=passphrase)
    return p_key.private_bytes(
        encoding=serialization.Encoding.DER,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption(),
    )


def get_snowflake_connection():
    private_key_bytes = load_private_key_bytes()
    return snowflake.connector.connect(
        user=SNOWFLAKE_SERVICE_USERNAME,
        account=SNOWFLAKE_ACCOUNT,
        private_key=private_key_bytes,
        role=SNOWFLAKE_SERVICE_ROLE,
        warehouse=SNOWFLAKE_WAREHOUSE,
        database=SNOWFLAKE_DATABASE,
        schema=SNOWFLAKE_SCHEMA,
    )


def fetch_distances(conn, report_date: date):
    """
    Returns:
      last_day: { TBOXID: distance_km }   (that single day, all sessions summed)
      totals:   { TBOXID: distance_km }   (all-time cumulative, all sessions summed)
    """
    cs = conn.cursor()
    try:
        cs.execute(
            f"""
            SELECT TBOXID, SUM(DISTANCE_KM) AS DISTANCE_KM
            FROM {VIEW_NAME}
            WHERE GPS_DATE = %s
            GROUP BY TBOXID
            """,
            (report_date,),
        )
        last_day = {row[0]: float(row[1]) for row in cs.fetchall()}

        cs.execute(
            f"""
            SELECT TBOXID, SUM(DISTANCE_KM) AS DISTANCE_KM
            FROM {VIEW_NAME}
            GROUP BY TBOXID
            """
        )
        totals = {row[0]: float(row[1]) for row in cs.fetchall()}
    finally:
        cs.close()

    return last_day, totals


# ---------------------------------------------------------------------------
# AWS S3 client
# ---------------------------------------------------------------------------

def get_s3_client():
    if not AWS_ACCESS_KEY_ID or not AWS_SECRET_ACCESS_KEY:
        raise RuntimeError("Set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY.")
    return boto3.client(
        "s3",
        region_name=AWS_REGION,
        aws_access_key_id=AWS_ACCESS_KEY_ID,
        aws_secret_access_key=AWS_SECRET_ACCESS_KEY,
    )


# ---------------------------------------------------------------------------
# S3
# ---------------------------------------------------------------------------

def upload_report(report: dict, report_date: date):
    s3 = get_s3_client()
    body = json.dumps(report, indent=2).encode("utf-8")

    dated_key = f"{S3_PREFIX}/{report_date.isoformat()}.json"
    latest_key = f"{S3_PREFIX}/latest.json"

    for key in (dated_key, latest_key):
        s3.put_object(
            Bucket=S3_BUCKET,
            Key=key,
            Body=body,
            ContentType="application/json",
        )
        log.info("Uploaded s3://%s/%s", S3_BUCKET, key)


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    report_date = date.today() - timedelta(days=1)  # "last day" = yesterday
    log.info("Building distance report for %s", report_date.isoformat())

    conn = get_snowflake_connection()
    try:
        last_day, totals = fetch_distances(conn, report_date)
    finally:
        conn.close()

    tbox_ids = sorted(set(last_day) | set(totals))
    scooters = [
        {
            "tboxid": tbox_id,
            "last_day_distance_km": round(last_day.get(tbox_id, 0.0), 3),
            "total_distance_km": round(totals.get(tbox_id, 0.0), 3),
        }
        for tbox_id in tbox_ids
    ]

    report = {
        "date": report_date.isoformat(),
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "fleet_last_day_distance_km": round(sum(last_day.values()), 3),
        "fleet_total_distance_km": round(sum(totals.values()), 3),
        "scooters": scooters,
    }

    upload_report(report, report_date)
    log.info("Done. %d scooters in report.", len(scooters))


if __name__ == "__main__":
    try:
        main()
    except Exception:
        log.exception("Daily distance report failed")
        sys.exit(1)