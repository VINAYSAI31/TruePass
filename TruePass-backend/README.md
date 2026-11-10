# Digital Identity Proofing Platform - Backend (MVP)

A small, beginner-friendly Spring Boot backend for a customer identity verification workflow.

- The **Internal Operations team** creates verification applications, compares the two vendors' answers, runs the decision engine and handles manual reviews.
- **Vendor A** and **Vendor B** each see the applications and independently submit their own verification result, each in their own format.

Stack: Java 17, Spring Boot 3.5, Maven, Spring Web, Spring Data JPA, PostgreSQL 16, Bean Validation, Actuator.
No Lombok, no Spring Security, no JWT.

---

## IMPORTANT: the login is a simulation

`POST /api/auth/demo-login` is a **simulated login for the MVP only**. It is **not** real authentication and provides **no production security**:

- The three accounts and their passwords are hard-coded and compared in plain text.
- There is no password hashing, no JWT, no token expiry and no HTTPS enforcement.
- The "session" is a random id kept in memory. It is lost when the server restarts.
- Anyone who can reach the API and knows a demo password can act as that identity.

What the demo session *does* do: the backend remembers which identity logged in and uses it for every portal-specific check. The frontend only sends the session id in the `X-Demo-Session` header; it can never choose the vendor. A vendor's identity for a submission comes from the session, not from the request body. Replace this with Spring Security (and real credentials) before any real use.

| Username   | Password    | Role       |
|------------|-------------|------------|
| `admin`    | `admin123`  | `INTERNAL` |
| `vendor_a` | `vendor123` | `VENDOR_A` |
| `vendor_b` | `vendor123` | `VENDOR_B` |

Access rules enforced by the backend:

- `/api/vendor/**` is only for `VENDOR_A` / `VENDOR_B`.
- All other `/api/**` endpoints (applications, decisions, exceptions, dashboard, audit logs) are only for `INTERNAL`.
- Missing or unknown session: `401`. Wrong role: `403`.
- A vendor can never read or change the other vendor's responses through the vendor endpoints.

---

## Prerequisites

- JDK 17 or newer
- Maven 3.9+
- PostgreSQL 16 (local install or Docker)

## 1. Create the database

**Option A - Docker**

```bash
docker run --name identity-postgres \
  -e POSTGRES_PASSWORD=choose_a_password \
  -e POSTGRES_DB=identity_db \
  -p 5432:5432 -d postgres:16
```

**Option B - local PostgreSQL**

```bash
psql -U postgres -f docs/database-setup.sql
```

Tables are created automatically by Hibernate (`ddl-auto=update`) on first start. See `docs/database-setup.sql` for handy queries and a reset script.

## 2. Configure the application

```bash
cp src/main/resources/application.properties.example src/main/resources/application.properties
```

Open `application.properties` and put your database password in `spring.datasource.password`.
`application.properties` is in `.gitignore`, so your real password is never committed.

Defaults: database `identity_db`, user `postgres`, port `8081`.

## 3. Build, test and run

```bash
mvn clean test          # unit tests, no database needed
mvn spring-boot:run     # starts on http://localhost:8081
```

Health check: `GET http://localhost:8081/actuator/health` -> `{"status":"UP"}`

---

## Project structure

```
src/main/java/com/digitalidentity/proofing
  controller/   REST endpoints (thin - they call services)
  service/      business logic (DecisionService holds all decision rules)
  repository/   Spring Data JPA repositories
  entity/       JPA entities
  dto/          request/response records (entities are never returned directly)
  enums/        statuses and roles
  config/       demo session interceptor + web config
  exception/    ApiException + one global exception handler
```

## Key design decisions

- **One decision engine, one place.** All rules live in `DecisionService.applyRules()`; it is plain Java with no database access, so it is unit tested directly.
- **Vendor formats are normalized.** Vendor A (`result`, `score`) and Vendor B (`verificationStatus`, `confidence`) are validated by `VendorResponseNormalizer` and stored in the common `VendorResponse` entity. Vendor B's 0-1 confidence is converted to a 0-100 score. Sending the other vendor's fields is rejected with `400`.
- **Duplicate and correction rule.**
  - A vendor's first answer for an application: `POST /api/vendor/responses` -> `201`.
  - A second `POST` for the same application and vendor -> `409` (accidental duplicate). The message contains the id to correct.
  - To correct an answer: `PUT /api/vendor/responses/{id}`. The row is updated in place, `responseStatus` becomes `UPDATED`, and the change is audited. Corrections are blocked once the application is `PASSED` or `REJECTED`.
  - The database also has a unique constraint on (application, vendor) as a safety net.
- **Re-evaluation.** `POST /api/decisions/evaluate/{id}` can be called again after vendors correct answers. The single decision row is updated; an open manual-review exception is closed automatically if the new result is no longer `MANUAL_REVIEW`.
- **Everything is audited.** Application creation, vendor submissions/corrections, evaluations, exception creation and manual reviews all write to `audit_logs`.

## Assumptions to be aware of

- Every application is visible to both vendors ("assigned" means all applications). There is no per-vendor assignment table in this MVP.
- Both vendors returning a negative result is treated as `REJECT` regardless of confidence. The "confidence below 85" rule only applies when both vendors verified the applicant.
- A technical error (`ERROR`) from either vendor takes priority over every other rule and gives `RETRY`.
- Manual review `APPROVE` -> application `PASSED`, `REJECT` -> `REJECTED`, `RETRY` -> `RETRY`.

## API documentation

See [docs/API.md](docs/API.md) for every endpoint with sample requests and responses, plus the full demo flow in `curl`.
