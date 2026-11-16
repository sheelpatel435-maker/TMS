# UI Prompt — Separate Driver / Helper Assignments

Use this prompt with your UI agent. Backend is already updated.

## Goal
Update Vehicle Assignment UI so Driver and Helper are assigned **separately**, full **history** is visible, and assignments can be **edited**.

## Backend API (already live in TMS backend)

Base: `/api/vehicle-assignments`  
Auth: Bearer JWT. Company Admin / Super Admin (with company context) bypass Vehicles ACL.

### Create (separate rows)
`POST /api/vehicle-assignments`

Driver:
```json
{
  "vehicle_id": 1,
  "assignment_role": "DRIVER",
  "driver_id": 10,
  "start_date": "2026-01-01",
  "end_date": null
}
```

Helper:
```json
{
  "vehicle_id": 1,
  "assignment_role": "HELPER",
  "helper_id": 20,
  "start_date": "2026-01-01",
  "end_date": null
}
```

Rules:
- Do **not** send driver + helper in one request.
- `assignment_role` must be `DRIVER` or `HELPER`.
- One active DRIVER and one active HELPER per vehicle (overlap returns 409).

### Edit
`PUT /api/vehicle-assignments/:id`
```json
{
  "vehicle_id": 1,
  "assignment_role": "DRIVER",
  "driver_id": 11,
  "start_date": "2026-01-01",
  "end_date": "2026-03-31",
  "is_active": 1
}
```

### Close (history retained)
`PATCH /api/vehicle-assignments/:id/close`  
Body optional: `{ "end_date": "2026-03-31" }`

### List / filters
`GET /api/vehicle-assignments?vehicle_id=1&assignment_role=DRIVER&status=1&limit=100`

### Full history (active + closed)
`GET /api/vehicle-assignments/history?vehicle_id=1&limit=100`  
Also: `?driver_id=10` or `?helper_id=20` or `?assignment_role=HELPER`

Response shape:
```json
{
  "success": true,
  "history": [ /* same as assignments */ ],
  "assignments": [],
  "pagination": {}
}
```

Each row fields:
`id, company_id, vehicle_id, assignment_role, driver_id, helper_id, start_date, end_date, is_active, created_at, updated_at`

## UI requirements
1. On vehicle Manage → Assignments:
   - Two forms or tabs: **Assign Driver** and **Assign Helper** (not one combined form).
2. Show **Active now**:
   - Active DRIVER (if any) + Active HELPER (if any), each with Edit + Close.
3. **Edit** opens form prefilled; saves via PUT.
4. **History** table (all roles or filter Driver/Helper):
   - Role, Person id/name, Vehicle, Start, End, Active/Closed.
   - Load from `/history?vehicle_id=...`
5. Optional pages/sections:
   - Driver detail → assignment history (`/history?driver_id=`)
   - Helper detail → assignment history (`/history?helper_id=`)
6. Keep completed **trip history** tab as-is (`GET /api/vehicles/:id/trip-history`) — that is trip snapshots, separate from assignment history.
7. Show clear 409 messages when overlap happens.
8. Super Admin must have company context selected before calling these APIs.

## Out of scope
- Do not put driver+helper in one create payload.
- Do not remove close/history retention.
- Mobile app changes not required unless asked.
