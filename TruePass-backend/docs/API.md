# API Documentation

Base URL: `http://localhost:8081`

All endpoints except `/api/auth/demo-login` and `/actuator/health` need the header

```
X-Demo-Session: <sessionId returned by demo-login>
```

> The demo login is a simulation, not real authentication. See the README.

## Error format

Every error uses the same JSON shape:

```json
{
  "timestamp": "2026-11-10T10:30:00.123",
  "status": 400,
  "error": "Bad Request",
  "message": "Validation failed. See fieldErrors for details.",
  "path": "/api/applications",
  "fieldErrors": { "email": "email must be a valid email address" }
}
```

`fieldErrors` only appears for validation errors.

| Status | When |
|--------|------|
| 400 | Validation failed, malformed JSON, unknown enum value, wrong vendor format |
| 401 | Missing/unknown `X-Demo-Session`, wrong demo credentials |
| 403 | Identity not allowed on this endpoint (e.g. vendor calling `/api/applications`) |
| 404 | Application, exception or response not found |
| 409 | Duplicate vendor response, exception already resolved, application already closed |

---

## 1. Demo login

### `POST /api/auth/demo-login`

```json
{ "username": "vendor_a", "password": "vendor123" }
```

`200 OK`

```json
{
  "sessionId": "3f0c2b9e-6a1d-4f0e-9d0b-2f6f5c1f9a11",
  "username": "vendor_a",
  "role": "VENDOR_A",
  "vendorId": "VENDOR_A",
  "note": "Simulated demo session. Send sessionId in the X-Demo-Session header. Not real authentication."
}
```

For `admin` the role is `INTERNAL` and `vendorId` is `null`. Wrong credentials: `401`.

---

## 2. Internal portal (role `INTERNAL`)

### `POST /api/applications` - create

```json
{
  "applicantName": "Asha Raman",
  "email": "asha.raman@example.com",
  "phoneNumber": "+91 98765 43210",
  "documentType": "PASSPORT",
  "documentReference": "P1234567"
}
```

`documentType`: `PASSPORT`, `NATIONAL_ID`, `DRIVING_LICENSE`, `OTHER`.

`201 Created`

```json
{
  "id": 1,
  "applicationReference": "APP-9C1F4A2B",
  "applicantName": "Asha Raman",
  "email": "asha.raman@example.com",
  "phoneNumber": "+91 98765 43210",
  "documentType": "PASSPORT",
  "documentReference": "P1234567",
  "applicationStatus": "WAITING_FOR_RESPONSES",
  "createdAt": "2026-11-10T10:30:00.123",
  "updatedAt": "2026-11-10T10:30:00.123"
}
```

### `GET /api/applications` - list / search

Optional query parameters:

- `status` - `WAITING_FOR_RESPONSES`, `PASSED`, `REJECTED`, `MANUAL_REVIEW`, `RETRY`
- `search` - partial, case-insensitive match on name, email, application reference or document reference

`GET /api/applications?status=MANUAL_REVIEW&search=asha` returns an array of the objects shown above, newest first.

### `GET /api/applications/{id}`

Returns one application object. `404` if it does not exist.

### `GET /api/applications/{id}/comparison`

`200 OK`

```json
{
  "application": { "id": 1, "applicationReference": "APP-9C1F4A2B", "applicationStatus": "PASSED", "...": "..." },
  "vendorA": {
    "id": 1, "applicationId": 1, "applicationReference": "APP-9C1F4A2B",
    "vendorName": "VENDOR_A", "vendorReference": "A-1001",
    "verificationStatus": "VERIFIED", "confidenceScore": 92.0,
    "remarks": "Document details match", "responseStatus": "SUBMITTED",
    "submittedAt": "2026-11-10T10:31:10.000"
  },
  "vendorB": {
    "id": 2, "applicationId": 1, "applicationReference": "APP-9C1F4A2B",
    "vendorName": "VENDOR_B", "vendorReference": "B-5001",
    "verificationStatus": "VERIFIED", "confidenceScore": 91.0,
    "remarks": "Identity verified", "responseStatus": "SUBMITTED",
    "submittedAt": "2026-11-10T10:31:40.000"
  },
  "decision": {
    "id": 1, "applicationId": 1, "applicationReference": "APP-9C1F4A2B",
    "vendorAStatus": "VERIFIED", "vendorBStatus": "VERIFIED",
    "finalDecision": "PASS",
    "decisionReason": "Both vendors verified the applicant with confidence of at least 85.",
    "applicationStatus": "PASSED",
    "evaluatedAt": "2026-11-10T10:32:00.000"
  }
}
```

`vendorA`, `vendorB` and `decision` are `null` until they exist.

---

## 3. Vendor portal (role `VENDOR_A` or `VENDOR_B`)

The vendor is always taken from the session. A vendor never sees the other vendor's responses, the decision, or the application status.

### `GET /api/vendor/applications`

```json
[
  {
    "id": 1,
    "applicationReference": "APP-9C1F4A2B",
    "applicantName": "Asha Raman",
    "email": "asha.raman@example.com",
    "phoneNumber": "+91 98765 43210",
    "documentType": "PASSPORT",
    "documentReference": "P1234567",
    "createdAt": "2026-11-10T10:30:00.123",
    "alreadySubmitted": false
  }
]
```

`alreadySubmitted` is `true` once the logged-in vendor has answered that application.

### `GET /api/vendor/applications/{id}`

Same object as above for one application. `404` if missing.

### `POST /api/vendor/responses` - submit

**Vendor A** (logged in as `vendor_a`) - fields `result` (`VERIFIED` / `REJECTED` / `ERROR`) and `score` (0-100):

```json
{
  "applicationId": 1,
  "vendorReference": "A-1001",
  "result": "VERIFIED",
  "score": 92,
  "remarks": "Document details match"
}
```

**Vendor B** (logged in as `vendor_b`) - fields `verificationStatus` (`PASS` / `FAIL` / `ERROR`) and `confidence` (0.0-1.0):

```json
{
  "applicationId": 1,
  "vendorReference": "B-5001",
  "verificationStatus": "PASS",
  "confidence": 0.91,
  "remarks": "Identity verified"
}
```

`201 Created` (Vendor B example - confidence normalized to 0-100):

```json
{
  "id": 2,
  "applicationId": 1,
  "applicationReference": "APP-9C1F4A2B",
  "vendorName": "VENDOR_B",
  "vendorReference": "B-5001",
  "verificationStatus": "VERIFIED",
  "confidenceScore": 91.0,
  "remarks": "Identity verified",
  "responseStatus": "SUBMITTED",
  "submittedAt": "2026-11-10T10:31:40.000"
}
```

Normalization: Vendor A `VERIFIED/REJECTED/ERROR` and Vendor B `PASS/FAIL/ERROR` become `VERIFIED/NOT_VERIFIED/ERROR`.
`score` / `confidence` may be omitted only when the result is `ERROR`.

Rejected with `400`: missing fields, unknown result values, score outside 0-100, confidence outside 0-1, or the other vendor's field names (for example Vendor A sending `confidence`).

Duplicate (the same vendor answering the same application again) -> `409`:

```json
{
  "status": 409,
  "error": "Conflict",
  "message": "VENDOR_A has already submitted a response for application 1 (response id 1). To correct it, call PUT /api/vendor/responses/1.",
  "path": "/api/vendor/responses"
}
```

### `PUT /api/vendor/responses/{id}` - correct a response

Same body format as `POST` for that vendor; `applicationId` must match the response's application.

```json
{
  "applicationId": 1,
  "vendorReference": "A-1001",
  "result": "VERIFIED",
  "score": 95,
  "remarks": "Re-checked, details match"
}
```

`200 OK` with the updated response; `responseStatus` becomes `UPDATED`. Rules:

- Only the vendor that owns the response can correct it. For the other vendor the response is reported as `404`.
- Not allowed once the application is `PASSED` or `REJECTED` (`409`).
- Re-run `POST /api/decisions/evaluate/{applicationId}` (internal) to refresh the decision.

### `GET /api/vendor/responses`

Array of the logged-in vendor's own responses (same shape as the `201` body above), newest first.

### `GET /api/vendor/dashboard/summary`

```json
{ "assignedApplications": 5, "pendingApplications": 2, "completedApplications": 3 }
```

`assigned` = all applications, `completed` = applications this vendor answered, `pending` = the rest.

---

## 4. Decision engine (role `INTERNAL`)

### `POST /api/decisions/evaluate/{applicationId}`

No body. `200 OK`:

```json
{
  "id": 1,
  "applicationId": 1,
  "applicationReference": "APP-9C1F4A2B",
  "vendorAStatus": "VERIFIED",
  "vendorBStatus": "NOT_VERIFIED",
  "finalDecision": "MANUAL_REVIEW",
  "decisionReason": "Vendors disagree (Vendor A: VERIFIED, Vendor B: NOT_VERIFIED).",
  "applicationStatus": "MANUAL_REVIEW",
  "evaluatedAt": "2026-11-10T10:32:00.000"
}
```

Rules (first match wins):

| # | Situation | Decision | Application status |
|---|-----------|----------|--------------------|
| 1 | Neither vendor responded | `WAITING_FOR_RESPONSES` | `WAITING_FOR_RESPONSES` |
| 2 | Only one vendor responded | `WAITING_FOR_RESPONSES` | `WAITING_FOR_RESPONSES` |
| 3 | Either vendor reported `ERROR` | `RETRY` | `RETRY` |
| 4 | Vendors disagree | `MANUAL_REVIEW` (priority HIGH) | `MANUAL_REVIEW` |
| 5 | Both negative | `REJECT` | `REJECTED` |
| 6 | Both verified, any confidence < 85 | `MANUAL_REVIEW` (priority MEDIUM) | `MANUAL_REVIEW` |
| 7 | Both verified, both confidence >= 85 | `PASS` | `PASSED` |

The decision is stored (one row per application, updated on re-evaluation). `MANUAL_REVIEW` automatically creates an open exception. Every evaluation is written to the audit log.

---

## 5. Manual review (role `INTERNAL`)

### `GET /api/exceptions`

Optional `?status=OPEN` or `?status=RESOLVED`. Newest first.

```json
[
  {
    "id": 1,
    "applicationId": 1,
    "applicationReference": "APP-9C1F4A2B",
    "reason": "Vendors disagree (Vendor A: VERIFIED, Vendor B: NOT_VERIFIED).",
    "priority": "HIGH",
    "queueStatus": "OPEN",
    "reviewerName": null,
    "reviewerComments": null,
    "createdAt": "2026-11-10T10:32:00.000",
    "resolvedAt": null
  }
]
```

### `GET /api/exceptions/{id}`

One exception object. `404` if missing.

### `POST /api/exceptions/{id}/review`

```json
{
  "reviewerName": "Internal Admin",
  "decision": "APPROVE",
  "reasonCode": "MANUAL_VERIFICATION",
  "comments": "Reviewed the vendor responses"
}
```

`decision`: `APPROVE` (application -> `PASSED`), `REJECT` (-> `REJECTED`), `RETRY` (-> `RETRY`).

`200 OK`:

```json
{
  "id": 1,
  "applicationId": 1,
  "applicationReference": "APP-9C1F4A2B",
  "reason": "Vendors disagree (Vendor A: VERIFIED, Vendor B: NOT_VERIFIED).",
  "priority": "HIGH",
  "queueStatus": "RESOLVED",
  "reviewerName": "Internal Admin",
  "reviewerComments": "[MANUAL_VERIFICATION] Reviewed the vendor responses",
  "createdAt": "2026-11-10T10:32:00.000",
  "resolvedAt": "2026-11-10T10:40:00.000"
}
```

Reviewing an already resolved exception returns `409`. The stored decision, application status and audit log are updated.

---

## 6. Dashboard and audit (role `INTERNAL`)

### `GET /api/dashboard/summary`

```json
{
  "totalApplications": 5,
  "passedApplications": 2,
  "rejectedApplications": 1,
  "manualReviewApplications": 1,
  "waitingApplications": 1,
  "retryApplications": 0
}
```

### `GET /api/audit-logs`

Optional `?applicationId=1`. Newest first.

```json
[
  {
    "id": 7,
    "applicationId": 1,
    "action": "MANUAL_REVIEW_COMPLETED",
    "performedBy": "admin",
    "description": "Exception 1 reviewed by Internal Admin: APPROVE (MANUAL_VERIFICATION). Application is now PASSED.",
    "createdAt": "2026-11-10T10:40:00.000"
  }
]
```

Audit actions: `APPLICATION_CREATED`, `VENDOR_RESPONSE_SUBMITTED`, `VENDOR_RESPONSE_UPDATED`, `DECISION_EVALUATED`, `EXCEPTION_CREATED`, `EXCEPTION_AUTO_RESOLVED`, `MANUAL_REVIEW_COMPLETED`.

---

## 7. Actuator

`GET /actuator/health` -> `{"status":"UP"}` (no session header needed).

---

## 8. Full demo flow with curl

Requires `jq`. Run from any shell while the app is running.

```bash
BASE=http://localhost:8081

login() {   # usage: login <username> <password>
  curl -s -X POST $BASE/api/auth/demo-login -H 'Content-Type: application/json' \
    -d "{\"username\":\"$1\",\"password\":\"$2\"}" | jq -r .sessionId
}

ADMIN=$(login admin admin123)
VA=$(login vendor_a vendor123)
VB=$(login vendor_b vendor123)

# 1. Internal team creates an application
curl -s -X POST $BASE/api/applications -H "X-Demo-Session: $ADMIN" -H 'Content-Type: application/json' -d '{
  "applicantName":"Asha Raman","email":"asha.raman@example.com","phoneNumber":"+91 98765 43210",
  "documentType":"PASSPORT","documentReference":"P1234567"}' | jq

# 2. Vendor A submits (its own format)
curl -s -X POST $BASE/api/vendor/responses -H "X-Demo-Session: $VA" -H 'Content-Type: application/json' -d '{
  "applicationId":1,"vendorReference":"A-1001","result":"VERIFIED","score":92,"remarks":"Document details match"}' | jq

# 3. Vendor B submits (its own format)
curl -s -X POST $BASE/api/vendor/responses -H "X-Demo-Session: $VB" -H 'Content-Type: application/json' -d '{
  "applicationId":1,"vendorReference":"B-5001","verificationStatus":"PASS","confidence":0.91,"remarks":"Identity verified"}' | jq

# 4. Internal team evaluates and compares
curl -s -X POST $BASE/api/decisions/evaluate/1 -H "X-Demo-Session: $ADMIN" | jq
curl -s $BASE/api/applications/1/comparison -H "X-Demo-Session: $ADMIN" | jq

# 5. Dashboard and audit trail
curl -s $BASE/api/dashboard/summary -H "X-Demo-Session: $ADMIN" | jq
curl -s "$BASE/api/audit-logs?applicationId=1" -H "X-Demo-Session: $ADMIN" | jq

# Checks that access control works (each returns an error):
curl -s $BASE/api/applications -H "X-Demo-Session: $VA" | jq          # 403 - vendor on internal endpoint
curl -s $BASE/api/vendor/responses -H "X-Demo-Session: $ADMIN" | jq  # 403 - internal on vendor endpoint
curl -s $BASE/api/vendor/responses | jq                                # 401 - no session
```

To try manual review, create a second application and have Vendor A send `VERIFIED` / 92 while Vendor B sends `FAIL` / 0.80, evaluate it, then:

```bash
curl -s $BASE/api/exceptions -H "X-Demo-Session: $ADMIN" | jq
curl -s -X POST $BASE/api/exceptions/1/review -H "X-Demo-Session: $ADMIN" -H 'Content-Type: application/json' -d '{
  "reviewerName":"Internal Admin","decision":"APPROVE","reasonCode":"MANUAL_VERIFICATION",
  "comments":"Reviewed the vendor responses"}' | jq
```
