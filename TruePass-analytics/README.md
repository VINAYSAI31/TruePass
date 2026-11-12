# TruePass Analytics ETL

A standalone, one-shot Python ETL job. It reads the TruePass PostgreSQL
database, produces five privacy-safe analytics CSV files, and uploads them to
Amazon S3 for Snowflake to consume.

This is **not** a web application. There is no API, no frontend, no server and
no scheduler loop inside it. It runs once and exits with a status code.

---

## 1. Project purpose

TruePass holds operational data about applications, vendor verification
responses, final decisions, manual-review exceptions and audit events. The
analytics team needs that data in a warehouse, but it must not receive
personally identifiable information.

This job:

1. Extracts only the analytics-relevant columns, using read-only SQL.
2. Cleans and standardises them (timestamps, NULLs, duplicates, column names).
3. Writes five CSV files.
4. Uploads them to a known S3 layout.

PII never leaves the source database: the extract queries do not select
`applicant_name`, `email`, `phone_number`, `document_reference`,
`reviewer_name`, `reviewer_comments`, `audit_logs.description`,
`audit_logs.performed_by`, `vendor_reference` or `vendor_responses.remarks`.
Applications are identified only by their integer IDs.

## 2. Architecture and data flow

```
                          +------------------+
                          |  main.py         |
                          |  orchestrates    |
                          +--------+---------+
                                   |
   config.py  ---------------------+  load configuration from env vars
   logger.py  ---------------------+  console + logs/etl_<timestamp>.log
                                   |
                                   v
   database.py   SQLAlchemy engine, read-only transactions
                                   |
                                   v
   extract.py    5 read-only SELECTs  ->  5 raw DataFrames
                                   |
                                   v
   transform.py  pure DataFrame -> DataFrame cleaning + schema validation
                                   |
                                   v
   export.py     output/*.csv  (5 files)
                                   |
                                   v
   s3_upload.py  s3://<bucket>/truepass-analytics/<folder>/<file>.csv
                                   |
                                   v
                       execution summary, exit 0
```

Three properties worth knowing:

* **Read-only by construction.** Every extract runs inside
  `SET TRANSACTION READ ONLY`, so PostgreSQL itself rejects any write. The job
  cannot modify the source database even if someone adds a bad query later.
* **`transform.py` is pure.** No database, no disk, no AWS. That is why the
  unit tests need no infrastructure.
* **Validation happens immediately before writing.** `validate_columns()` runs
  in `export.py` as the last gate: wrong schema, wrong column order, or any
  restricted column present, and the job fails instead of writing the file.

### Table-to-file mapping

| Source table             | Dataset            | CSV file               | S3 folder          |
| ------------------------ | ------------------ | ---------------------- | ------------------ |
| `applications`           | `applications`     | `applications.csv`     | `applications/`    |
| `vendor_responses`       | `vendor_responses` | `vendor_responses.csv` | `vendor_responses/`|
| `verification_decisions` | `final_decisions`  | `final_decisions.csv`  | `decisions/`       |
| `exception_queue`        | `manual_reviews`   | `manual_reviews.csv`   | `manual_reviews/`  |
| `audit_logs`             | `audit_logs`       | `audit_logs.csv`       | `audit_logs/`      |

### Transformation rules

* Column names normalised to `lower_snake_case`; `vendorastatus` becomes
  `vendor_a_status`, `vendorbstatus` becomes `vendor_b_status`.
* Timestamps rendered as ISO 8601 UTC, e.g. `2026-01-01T09:00:00Z`. Naive
  timestamps are assumed to already be UTC. Unparseable values become blank.
* NULL text becomes an empty cell, never the string `nan` or `NaT`.
* IDs are nullable integers, so they never render as `12.0`.
* `confidence_score` is rounded to 4 decimal places.
* Duplicate primary keys are removed, keeping the first occurrence.
* Rows with a NULL primary key are dropped (they cannot be joined downstream);
  every other valid business record is preserved.
* An empty source table produces a header-only CSV, not a crash, so Snowflake
  always finds a file with a stable schema.
* Extracted, transformed and exported row counts are logged per dataset.

## 3. Python dependencies

| Package           | Why                                   |
| ----------------- | ------------------------------------- |
| `pandas`          | transformation and CSV writing        |
| `SQLAlchemy`      | engine and connection management      |
| `psycopg2-binary` | PostgreSQL driver                     |
| `boto3`           | S3 uploads                            |
| `python-dotenv`   | local `.env` loading                  |
| `pytest`          | unit tests (development only)         |

## 4. Local setup

**Linux / macOS**

```bash
cd TruePass-analytics
python3.11 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
```

**Windows PowerShell**

```powershell
cd TruePass-analytics
py -3.11 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
```

## 5. Environment configuration

Copy the template and edit it:

```bash
cp .env.example .env            # Linux / macOS
```

```powershell
Copy-Item .env.example .env     # Windows PowerShell
```

| Variable          | Required | Default              | Notes                                        |
| ----------------- | -------- | -------------------- | -------------------------------------------- |
| `DB_HOST`         | yes      | —                    | `localhost` locally, `postgres` on EC2       |
| `DB_PORT`         | no       | `5432`               |                                              |
| `DB_NAME`         | yes      | —                    | `truepass`                                   |
| `DB_USERNAME`     | yes      | —                    | use a read-only role in production           |
| `DB_PASSWORD`     | yes      | —                    | never logged                                 |
| `AWS_REGION`      | no       | `ap-south-1`         |                                              |
| `S3_BUCKET_NAME`  | yes\*    | —                    | \*required only when `UPLOAD_TO_S3` is true  |
| `UPLOAD_TO_S3`    | no       | `true`               | set `false` to validate locally without AWS  |
| `S3_BASE_PREFIX`  | no       | `truepass-analytics` |                                              |
| `OUTPUT_DIR`      | no       | `output`             |                                              |
| `LOG_DIR`         | no       | `logs`               |                                              |
| `LOG_LEVEL`       | no       | `INFO`               | `DEBUG` for verbose output                   |

`.env` is listed in `.gitignore` — do not commit it. AWS credentials are never
read from `.env`; see section 10.

Real environment variables always win over `.env`, which is what makes the same
image work locally and on EC2.

## 6. Running the ETL locally

Without AWS, to check the database side only:

```bash
UPLOAD_TO_S3=false python -m src.main        # Linux / macOS
```

```powershell
$env:UPLOAD_TO_S3="false"; python -m src.main   # Windows PowerShell
```

Full run including the S3 upload:

```bash
python -m src.main
```

Then check `output/` for the five CSVs and `logs/` for the run log. The exit
code is `0` on success and `1` if any critical stage failed:

```bash
echo $?            # Linux / macOS
```

```powershell
$LASTEXITCODE      # Windows PowerShell
```

## 7. Running unit tests

No PostgreSQL and no AWS account are needed — the tests use mock DataFrames and
a fake S3 client.

```bash
python -m pytest            # both platforms
python -m pytest -v         # verbose
```

54 tests cover transformation, NULL handling, timestamp formatting,
de-duplication, column validation, PII rejection, CSV generation, empty
datasets and the S3 key layout.

## 8. Building the Docker image

```bash
docker build -t truepass-analytics-etl:latest .
```

The image is based on `python:3.11-slim`, runs as a non-root user, exposes no
ports and starts no web server. `ENTRYPOINT` is `python -m src.main`, so the
container runs the job and exits.

## 9. Running the Docker container

Using an env file (note: `--env-file` needs plain `KEY=value` lines, no quotes):

```bash
docker run --rm \
  --env-file .env \
  -v "$(pwd)/output:/app/output" \
  -v "$(pwd)/logs:/app/logs" \
  truepass-analytics-etl:latest
```

**Windows PowerShell**

```powershell
docker run --rm `
  --env-file .env `
  -v "${PWD}\output:/app/output" `
  -v "${PWD}\logs:/app/logs" `
  truepass-analytics-etl:latest
```

Passing individual variables instead:

```bash
docker run --rm \
  -e DB_HOST=postgres -e DB_PORT=5432 -e DB_NAME=truepass \
  -e DB_USERNAME=analytics_ro -e DB_PASSWORD=*** \
  -e AWS_REGION=ap-south-1 -e S3_BUCKET_NAME=my-bucket \
  truepass-analytics-etl:latest
```

The volume mounts are optional — they only matter if you want the CSVs and logs
to survive the container exiting.

## 10. S3 upload configuration

Objects are written to:

```
s3://<S3_BUCKET_NAME>/truepass-analytics/
├── applications/applications.csv
├── vendor_responses/vendor_responses.csv
├── decisions/final_decisions.csv
├── manual_reviews/manual_reviews.csv
└── audit_logs/audit_logs.csv
```

Each run overwrites the same five keys.

**Credentials are never passed in code or in `.env`.** boto3 resolves them from
the standard chain:

* **On EC2** — the instance's attached IAM role. Nothing to configure.
* **Locally** — whatever the AWS CLI already uses: `~/.aws/credentials`,
  `AWS_PROFILE`, or `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` in your shell.

Verify your local identity before a full run:

```bash
aws sts get-caller-identity
aws s3 ls s3://your-bucket-name/truepass-analytics/
```

The IAM role or user needs `s3:PutObject` on
`arn:aws:s3:::<bucket>/truepass-analytics/*`.

## 11. How the ETL container runs on EC2

The intended deployment, once the local run is verified:

1. Build and push the image to Amazon ECR.

   ```bash
   aws ecr get-login-password --region ap-south-1 \
     | docker login --username AWS --password-stdin <account-id>.dkr.ecr.ap-south-1.amazonaws.com

   docker build -t truepass-analytics-etl:latest .
   docker tag truepass-analytics-etl:latest \
     <account-id>.dkr.ecr.ap-south-1.amazonaws.com/truepass-analytics-etl:latest
   docker push <account-id>.dkr.ecr.ap-south-1.amazonaws.com/truepass-analytics-etl:latest
   ```

2. On the EC2 instance, pull and run it on the same Docker network as the
   existing PostgreSQL container. **`DB_HOST` must be `postgres`** — the Docker
   Compose service hostname — not `localhost`, because inside a container
   `localhost` is the container itself.

   ```bash
   docker run --rm \
     --network <your-compose-network> \
     -e DB_HOST=postgres \
     -e DB_PORT=5432 \
     -e DB_NAME=truepass \
     -e DB_USERNAME=analytics_ro \
     -e DB_PASSWORD='***' \
     -e AWS_REGION=ap-south-1 \
     -e S3_BUCKET_NAME=your-bucket-name \
     <account-id>.dkr.ecr.ap-south-1.amazonaws.com/truepass-analytics-etl:latest
   ```

   Find the network name with `docker network ls`.

3. The container is a one-shot job: it runs, prints the summary, and exits.
   `--rm` cleans it up. Because it exits, anything that can run a command on a
   schedule works as the trigger — a cron entry on the instance, for example:

   ```
   0 2 * * * docker run --rm --network <net> --env-file /opt/truepass/etl.env <ecr-image> >> /var/log/truepass-etl.log 2>&1
   ```

   The EC2 instance's IAM role supplies the S3 permissions, so no AWS keys go
   into the environment file.

4. Check the result with `echo $?` or, for cron runs,
   `grep -E "ETL (finished|failed)" /var/log/truepass-etl.log`.

No infrastructure is created by this project. The bucket, instance, ECR
repository and IAM role are expected to exist already.

## 12. How Snowflake can consume the CSVs from S3

Not implemented in this project — no Snowflake code here yet. For reference,
the shape it is designed for:

* **External stage + `COPY INTO`.** Create a storage integration for the bucket,
  a stage pointing at `s3://<bucket>/truepass-analytics/`, and one table per
  dataset matching the CSV header. A scheduled Snowflake task runs `COPY INTO`
  per folder after the ETL finishes.
* **External tables.** Define one external table per folder for query-in-place
  without loading.
* **Snowpipe.** Auto-ingest on S3 event notifications, so each upload loads
  within a minute.

Three properties of the output make all three straightforward: the header row
is stable, timestamps are ISO 8601 UTC (`TRY_TO_TIMESTAMP_NTZ` parses them
directly), and missing values are empty cells rather than literal `NaN` text.
Because each run overwrites the same keys, a `COPY INTO` with
`FORCE = TRUE` into a staging table and a `MERGE` on the primary key is the
cleanest load pattern.

## 13. Project layout

```
TruePass-analytics/
├── src/
│   ├── __init__.py
│   ├── main.py          orchestration, summary, exit codes
│   ├── config.py        env vars -> frozen Config
│   ├── database.py      SQLAlchemy engine, read-only connections
│   ├── extract.py       the five read-only SELECTs
│   ├── transform.py     pure cleaning + schema validation
│   ├── export.py        CSV writing
│   ├── s3_upload.py     boto3 uploads
│   └── logger.py        logging setup
├── output/              generated CSVs (gitignored)
├── logs/                run logs (gitignored)
├── tests/
│   ├── __init__.py
│   ├── test_transform.py
│   └── test_export.py
├── requirements.txt
├── pytest.ini
├── .env.example
├── .gitignore
├── Dockerfile
└── README.md
```

## 14. Logging

Every run writes to the console and to `logs/etl_<UTC timestamp>.log`, covering
start and end time, database connection status, per-table extraction counts,
transformation status, CSV paths, S3 upload status, total duration, and full
tracebacks on failure.

Database passwords, connection URLs and AWS credentials are never logged. Nor
is any PII — the restricted columns are not selected in the first place, so
they cannot appear in a log line.
