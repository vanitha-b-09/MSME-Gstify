# Backend API Contract — GST Notice Manager

This document describes every HTTP endpoint the Lovable frontend expects from your **Node/Express** backend. Implement these on your side; the frontend will call them once `VITE_USE_MOCKS=false`.

**Base URL:** value of `VITE_API_URL` in `.env` (default `http://localhost:3000/api`).
**Auth:** JWT in `Authorization: Bearer <token>` header on every protected endpoint.

---

## 1. Auth

### POST `/auth/signup`
**Body**
```json
{ "name": "Ravi Sharma", "email": "ca@firm.in", "password": "secret12", "role": "ca" }
```
`role` is `"ca"` or `"admin"`.

**200 Response**
```json
{
  "token": "<jwt>",
  "user": { "id": "u_1", "name": "Ravi Sharma", "email": "ca@firm.in", "role": "ca" }
}
```
**Errors:** `409` if email already exists.

---

### POST `/auth/login`
**Body**
```json
{ "email": "ca@firm.in", "password": "secret12" }
```
**200 Response** — same shape as signup.
**Errors:** `401` invalid credentials.

---

### PATCH `/users/:id`  *(auth required)*
Update profile of the authenticated user.

**Body** (any subset)
```json
{ "name": "...", "firmName": "...", "phone": "..." }
```
**200 Response:** the updated `user` object.

---

## 2. Cases

### GET `/cases` *(auth required)*
List cases. CAs see their own; admins see all.

**200 Response**
```json
[
  {
    "id": "c_1001",
    "clientId": "cl_1",
    "clientName": "Acme Traders Pvt Ltd",
    "gstin": "27AAAAA0000A1Z5",
    "noticeType": "GSTR-3B Mismatch (Sec 61)",
    "status": "ready",
    "createdAt": "2025-04-17T10:30:00.000Z",
    "ownerName": "Ravi Sharma (CA)"
  }
]
```
`status` ∈ `"uploaded" | "processing" | "ready" | "submitted" | "error"`.

---

### POST `/cases` *(auth required, multipart/form-data)*
Create a new case from uploaded files.

**Form fields**
| Field | Type | Notes |
|---|---|---|
| `clientName` | text | required |
| `gstin` | text | required, 15-char GSTIN |
| `noticeFile` | file | required, PDF / JPG / PNG, ≤ 20 MB |
| `gstFiles` | file (repeated) | optional, XLS / XLSX / CSV, ≤ 10 MB each |

**200 Response:** the newly created case (same shape as GET `/cases` item).

---

## 3. Clients

### GET `/clients?category=manufacturing` *(auth required)*
Optional `category` query param. Valid values:
`manufacturing | trading | services | ecommerce | retail | construction | logistics | exports | other`.
Omit it to return all clients.

**200 Response**
```json
[
  {
    "id": "cl_1",
    "name": "Acme Traders Pvt Ltd",
    "gstin": "27AAAAA0000A1Z5",
    "category": "trading",
    "contactEmail": "accounts@acme.in",
    "contactPhone": "+91 98200 11111",
    "state": "Maharashtra",
    "activeCases": 2,
    "createdAt": "2025-03-18T10:30:00.000Z"
  }
]
```

---

## 4. Extracted Data

### GET `/extracted` *(auth required)*
Returns AI-parsed data for processed cases.

**200 Response**
```json
[
  {
    "caseId": "c_1001",
    "clientName": "Acme Traders Pvt Ltd",
    "gstin": "27AAAAA0000A1Z5",
    "noticeNumber": "ASMT-10/2024-25/MH/00123",
    "noticeType": "GSTR-3B vs GSTR-1 Mismatch",
    "issuedOn": "2025-03-12",
    "dueOn": "2025-04-11",
    "section": "Section 61, CGST Act 2017",
    "amountDemanded": "₹4,82,150",
    "summary": "...",
    "fields": [
      { "label": "Notice Number", "value": "ASMT-10/...", "confidence": 0.98 }
    ]
  }
]
```
`confidence` is a float between 0 and 1.

---

## CORS
Enable CORS on your Express server for the Lovable preview / production origin. Example:
```js
app.use(cors({ origin: ["http://localhost:5173", "https://your-app.lovable.app"], credentials: false }));
```

## Error format (recommended)
Return JSON with a `message` field on errors so the frontend can surface it:
```json
{ "message": "Invalid email or password" }
```

## Switching from mock to live
1. Start your Express server.
2. In `.env` set `VITE_USE_MOCKS=false` and `VITE_API_URL=http://localhost:3000/api`.
3. Restart the Vite dev server.
