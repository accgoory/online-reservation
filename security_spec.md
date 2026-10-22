# Security Specification: Savour & Co. Restaurant Reservation & Payment

## 1. Data Invariants
- A reservation must have valid customer details (name, email, phone), table information, party size, valid dates, and deposit amount.
- Status transitions must follow logical flow: `pending_payment` -> `confirmed` -> `seated` -> `completed` (or `cancelled`).
- Sensitive operations such as updating table status and marking reservations completed/seated are restricted to verified staff/admins or authorized flow.
- Admin bootstrap: `accgoory@gmail.com`.

## 2. The "Dirty Dozen" Payloads (Denial & Integrity Targets)
1. Creating reservation with malicious oversized customerName (> 100 chars) -> Denied
2. Creating reservation without required tableId or depositAmount -> Denied
3. Spoofing payment status directly to unauthorized states or illegal types -> Denied
4. Injecting script tags or arbitrary ghost fields in table updates -> Denied
5. Table status manipulation by unverified unauthorized callers -> Denied
6. Direct deletion of completed financial/reservation records -> Denied
7. Updating reservation with non-existent or negative guest count -> Denied
8. Modifying notification id with invalid path formatting -> Denied
9. Claiming admin role via client request payload -> Denied
10. Setting depositAmount as negative value -> Denied
11. Updating immutable fields such as createdAt or original reservation ID -> Denied
12. Attempting unbounded array injections into collections -> Denied
