# Daily Scooter Distance Report — Setup on a New Device

This job reads per-scooter distance data from a Snowflake view and uploads a
daily JSON summary (yesterday's distance + running total per scooter) to S3.

```
Snowflake (VEHICLE_DISTANCE_PUBLIC view)
        │  SELECT (read-only)
        ▼
daily_distance_report.py
        │  PUT JSON
        ▼
S3: amzn-s3-lencar-web/distance-reports/
```

---

## 1. Prerequisites

- Python 3.10+ installed
- Access to:
  - A Snowflake private key (`.p8` file or PEM text) for the `SCOOTER_API_SVC` service account
  - AWS access key + secret for an IAM user allowed to write to the target S3 bucket

If you don't have these yet, see **Appendix A** (Snowflake service account) and
**Appendix B** (AWS IAM user + policy) at the bottom of this file.

---

## 2. Get the files onto the new device

Copy these files into a project folder (e.g. `daily_distance_cron`):

- `daily_distance_report.py`
- `requirements.txt`
- `.env.example`

---

## 3. Create a virtual environment

**Windows (PowerShell):**
```powershell
cd path\to\scripts
python -m venv venv
.\venv\Scripts\Activate.ps1
```

If activation is blocked, run once (as your normal user, not admin):
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

**Linux / macOS:**
```bash
cd path/to/daily_distance_cron
python3 -m venv venv
source venv/bin/activate
```

---

## 4. Install dependencies

```bash
pip install --upgrade pip
pip install -r requirements.txt
```

Verify:
```bash
pip show python-dotenv
```
Should print version info. If not, the install didn't take — re-run the
command above.

---

## 5. Set up your `.env`

Copy `.env.example` to `.env` in the **same folder** as the script, then fill
in real values:

```dotenv
# --- Snowflake service account (key-pair auth) ---
SNOWFLAKE_ACCOUNT=BQSPVDD-GP91871
SNOWFLAKE_SERVICE_USERNAME=SCOOTER_API_SVC
SNOWFLAKE_SERVICE_ROLE=SCOOTER_API_READER
SNOWFLAKE_WAREHOUSE=COMPUTE_WH
SNOWFLAKE_DATABASE=REPORT_DB
SNOWFLAKE_SCHEMA=AI_DASHBOARD

# EITHER a path to the key file:
SNOWFLAKE_SERVICE_PRIVATE_KEY_PATH=/absolute/path/to/scooter_api_svc_key.p8
# OR the PEM contents inline (literal \n between lines is fine, the script
# normalizes it):
# SNOWFLAKE_SERVICE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"

# --- AWS (scoped IAM user) ---
AWS_REGION=ap-southeast-1
AWS_ACCESS_KEY_ID=your_access_key_id
AWS_SECRET_ACCESS_KEY=your_secret_access_key

# --- Output destination ---
DISTANCE_REPORT_BUCKET=amzn-s3-lencar-web
DISTANCE_REPORT_PREFIX=distance-reports
```

**Never commit `.env` or paste its real values anywhere outside this
device's own file system / secrets manager.** If a key or private key ever
gets pasted into a chat, ticket, or shared doc, treat it as compromised and
rotate it immediately (see Appendix A/B).

If using the key-file option, lock down permissions:
```bash
chmod 600 /absolute/path/to/scooter_api_svc_key.p8   # Linux/macOS
```
On Windows, right-click the file → Properties → Security, and restrict
access to your user account only.

---

## 6. Run it manually to test

```bash
python daily_distance_report.py
```

Expected output ends with two lines like:
```
Uploaded s3://amzn-s3-lencar-web/distance-reports/2026-08-30.json
Uploaded s3://amzn-s3-lencar-web/distance-reports/latest.json
Done. N scooters in report.
```

### Common errors and fixes

| Error | Cause | Fix |
|---|---|---|
| `Set either SNOWFLAKE_SERVICE_PRIVATE_KEY_PATH or SNOWFLAKE_SERVICE_PRIVATE_KEY` | `.env` not loaded, or variable name typo | Confirm `python-dotenv` is installed; confirm you're running from the same folder as `.env`; check variable name spelling |
| `Unable to load PEM file... Invalid symbol 92` | Literal `\n` in the key wasn't converted to real newlines | Make sure you're using the current version of the script (it normalizes `\n` automatically) |
| `Schema '...' does not exist or not authorized` | Wrong schema name, or role lacks `USAGE`/`SELECT` grants | Confirm schema name via `SHOW SCHEMAS IN DATABASE REPORT_DB;`; re-run the grants in Appendix A |
| `AccessDenied ... s3:PutObject` | IAM user has no S3 write policy | Attach the policy in Appendix B |
| `ResourceNotFoundException: IdentityPool ... not found` | Leftover Cognito config from an earlier approach | Not applicable to the current script — it uses plain IAM keys, not Cognito |

---

## 7. Schedule it with cron (Linux server) — production deployment

This script is meant to run daily on your Ubuntu server, not permanently on
a Windows dev machine. The project folder on the server is named
`daily_distance_cron`. Once tested locally:

```bash
# On the Ubuntu server
mkdir -p /home/ubuntu/daily_distance_cron /home/ubuntu/daily_distance_cron/logs
# copy daily_distance_report.py, requirements.txt, .env, and the key file here

cd /home/ubuntu/daily_distance_cron
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python3 daily_distance_report.py   # test run first
```

Check the server's timezone:
```bash
timedatectl
```

Add to crontab (`crontab -e`) to run at **12:00 PM Asia/Colombo**:

- If server timezone is already Asia/Colombo:
  ```
  0 12 * * * /home/ubuntu/daily_distance_cron/venv/bin/python3 /home/ubuntu/daily_distance_cron/daily_distance_report.py >> /home/ubuntu/daily_distance_cron/logs/daily_distance_report.log 2>&1
  ```
- If server timezone is UTC (Colombo is UTC+5:30):
  ```
  30 6 * * * /home/ubuntu/daily_distance_cron/venv/bin/python3 /home/ubuntu/daily_distance_cron/daily_distance_report.py >> /home/ubuntu/daily_distance_cron/logs/daily_distance_report.log 2>&1
  ```

### Renaming this folder later

A venv bakes its own absolute path into internal files at creation time, so
if you ever rename this folder again, don't just `mv` it and expect the venv
to keep working. Instead:
```bash
crontab -e                      # comment out the existing cron line first
mv daily_distance_cron <new_name>
cd <new_name>
rm -rf venv
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python3 daily_distance_report.py   # test before re-enabling cron
crontab -e                      # update the path and uncomment
```

---

## Appendix A — Snowflake service account setup (run once)

Run as `ACCOUNTADMIN` or a role with `CREATE USER`/`CREATE ROLE` privileges:

```sql
CREATE ROLE IF NOT EXISTS SCOOTER_API_READER;

GRANT USAGE ON DATABASE REPORT_DB TO ROLE SCOOTER_API_READER;
GRANT USAGE ON SCHEMA REPORT_DB.AI_DASHBOARD TO ROLE SCOOTER_API_READER;
GRANT SELECT ON VIEW REPORT_DB.AI_DASHBOARD.VEHICLE_DISTANCE_PUBLIC TO ROLE SCOOTER_API_READER;
GRANT USAGE ON WAREHOUSE COMPUTE_WH TO ROLE SCOOTER_API_READER;

CREATE USER IF NOT EXISTS SCOOTER_API_SVC
  RSA_PUBLIC_KEY = '<PUBLIC_KEY_CONTENTS>'
  DEFAULT_ROLE = SCOOTER_API_READER
  DEFAULT_WAREHOUSE = COMPUTE_WH
  MUST_CHANGE_PASSWORD = FALSE;

GRANT ROLE SCOOTER_API_READER TO USER SCOOTER_API_SVC;
```

Generate the key pair:
```bash
openssl genrsa 2048 | openssl pkcs8 -topk8 -inform PEM -out rsa_key.p8 -nocrypt
openssl rsa -in rsa_key.p8 -pubout -out rsa_key.pub
chmod 600 rsa_key.p8
```
Paste the contents of `rsa_key.pub` (minus header/footer lines) into the
`RSA_PUBLIC_KEY` value above.

**To rotate the key later** (e.g. if it's ever exposed):
```sql
ALTER USER SCOOTER_API_SVC SET RSA_PUBLIC_KEY = '<new public key contents>';
```

---

## Appendix B — AWS IAM user + policy setup (run once)

1. IAM → Users → create or select the user this job will run as
2. Add an inline policy (JSON editor):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "ScooterDistanceReportWrite",
      "Effect": "Allow",
      "Action": "s3:PutObject",
      "Resource": "arn:aws:s3:::amzn-s3-lencar-web/distance-reports/*"
    }
  ]
}
```

3. Generate an access key for that user (Security credentials tab →
   Create access key) and put it in `.env` as `AWS_ACCESS_KEY_ID` /
   `AWS_SECRET_ACCESS_KEY`.

Keep this user scoped to only this one prefix — don't reuse a broad,
shared AWS key for this job.

**To rotate the key later:** deactivate the old key in IAM, generate a new
one, update `.env`.

---

## Output format reference

```json
{
  "date": "2026-08-30",
  "generated_at": "2026-08-31T06:30:00+00:00",
  "fleet_last_day_distance_km": 452.7,
  "fleet_total_distance_km": 108234.9,
  "scooters": [
    { "tboxid": "TBOX001", "last_day_distance_km": 12.4, "total_distance_km": 980.2 },
    { "tboxid": "TBOX002", "last_day_distance_km": 8.1, "total_distance_km": 754.6 }
  ]
}
```

Written to both:
- `distance-reports/<date>.json` (dated snapshot, kept forever)
- `distance-reports/latest.json` (always overwritten, easiest for a
  frontend to fetch)