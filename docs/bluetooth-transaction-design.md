# Bluetooth Offline Transaction — Secured Design Flow

> **Constraint:** Strictly **no internet access** during the entire transaction lifecycle.  
> All security mechanisms operate purely offline using pre-provisioned keys, local secure storage, and cryptographic protocols.

---

## Table of Contents

1. [Terminology & Roles](#1-terminology--roles)
2. [Pre-Conditions (Before Going Offline)](#2-pre-conditions-before-going-offline)
3. [Security Primitives Used](#3-security-primitives-used)
4. [Detailed Transaction Flow](#4-detailed-transaction-flow)
5. [Message Schemas](#5-message-schemas)
6. [Error Handling & Edge Cases](#6-error-handling--edge-cases)
7. [Post-Transaction (When Back Online)](#7-post-transaction-when-back-online)

---

## 1. Terminology & Roles

| Term | Description |
|------|-------------|
| **X (Consumer)** | The paying party. Holds a local wallet balance in secure storage. |
| **Y (Vendor)** | The receiving party. Displays a QR code and accepts payments. |
| **TEE** | Trusted Execution Environment (e.g., Android StrongBox, iOS Secure Enclave). |
| **App Cert** | A certificate issued by the backend CA during online provisioning, bound to the device's TEE key pair. |
| **Tx ID** | A globally unique transaction identifier (UUIDv4) generated per transaction. |
| **Spending Counter** | A monotonic counter stored in TEE, incremented on every deduction. Prevents replay of old balance states. |

---

## 2. Pre-Conditions (Before Going Offline)

These steps **must** be completed while the device has internet connectivity:

### 2.1 Consumer (X) — Pre-Provisioning

- [x] **Wallet Balance Loaded** — Balance is encrypted and stored in TEE-backed secure storage.
- [x] **Key Pair Generated in TEE** — An ECDSA P-256 key pair is generated inside the TEE. The private key **never leaves** the hardware.
- [x] **App Certificate Issued** — The backend CA signs X's public key along with:
  - `consumer_id`
  - `device_id`
  - `certificate_expiry` (e.g., 24h rolling window)
  - `max_offline_spend_limit`
  - `ca_signature`
- [x] **Spending Counter Initialized** — Counter value synced with the server (e.g., `counter = 47`).
- [x] **Trusted CA Public Key Cached** — Used to validate Y's vendor certificate offline.

### 2.2 Vendor (Y) — Pre-Provisioning

- [x] **Key Pair Generated in TEE** — ECDSA P-256 key pair, private key hardware-bound.
- [x] **Vendor Certificate Issued** — The backend CA signs Y's public key along with:
  - `vendor_id`
  - `device_id`
  - `merchant_name`
  - `certificate_expiry`
  - `ca_signature`
- [x] **QR Code Generated** — Contains signed connection payload (see Step 1 below).
- [x] **Trusted CA Public Key Cached** — Used to validate X's consumer certificate offline.

---

## 3. Security Primitives Used

| Primitive | Purpose | Algorithm |
|-----------|---------|-----------|
| Asymmetric Key Pair | Identity & signing | ECDSA P-256 (TEE-bound) |
| Certificate Validation | Offline trust chain | X.509 with CA signature verification |
| Message Signing | Integrity & non-repudiation | ECDSA SHA-256 |
| Session Encryption | Confidentiality over BLE | AES-256-GCM with ECDH shared secret |
| Nonce / Tx ID | Anti-replay | UUIDv4 + monotonic counter |
| Spending Counter | Double-spend prevention | TEE-stored monotonic counter |
| HMAC | Message authentication | HMAC-SHA256 (derived from session key) |

---

## 4. Detailed Transaction Flow

### Step 1 — QR Code Scan & Secure BLE Connection

```
X (Consumer)                                              Y (Vendor)
     |                                                         |
     |              ┌──────────────────────────┐               |
     |◄─── SCAN ────┤  QR Code Displayed by Y  │              |
     |              └──────────────────────────┘               |
     |                                                         |
     |── BLE Connection Request (using QR BLE address) ───────►|
     |                                                         |
     |◄──────────── BLE Connection Accepted ──────────────────|
     |                                                         |
     |── ECDH Public Key (ephemeral) ─────────────────────────►|
     |◄── ECDH Public Key (ephemeral) ────────────────────────|
     |                                                         |
     |  [Both derive shared secret → AES-256-GCM session key]  |
     |                                                         |
```

**QR Code Payload (signed by Y's TEE key):**
```json
{
  "version": 1,
  "vendor_id": "VND-20260425-001",
  "ble_address": "AA:BB:CC:DD:EE:FF",
  "ble_service_uuid": "0000fff0-0000-1000-8000-00805f9b34fb",
  "timestamp": 1745571600,
  "nonce": "a3f8c91b-e2d4-4f6a-b8c1-9d7e5f3a2b10",
  "vendor_cert_fingerprint": "SHA256:9f86d08...",
  "signature": "<ECDSA signature over all above fields>"
}
```

**Security checks performed by X:**
1. ✅ Verify QR `signature` using the **CA public key** (trusted, pre-cached)
2. ✅ Check `timestamp` is within acceptable drift window (e.g., ±5 minutes)
3. ✅ Verify `nonce` has not been seen before (local nonce cache)
4. ✅ Establish BLE Secure Connection with ECDH key exchange
5. ✅ Derive AES-256-GCM session key from ECDH shared secret

> **From this point, all messages are encrypted with AES-256-GCM using the session key.**

---

### Step 2 — Consumer Sends Transaction Request

```
X (Consumer)                                              Y (Vendor)
     |                                                         |
     |── [ENCRYPTED] Transaction Request ─────────────────────►|
     |                                                         |
```

**Transaction Request Payload (before encryption):**
```json
{
  "msg_type": "TX_REQUEST",
  "tx_id": "b7c9d1e3-4f5a-6b7c-8d9e-0f1a2b3c4d5e",
  "consumer_id": "CSM-20260101-789",
  "amount": 25.50,
  "currency": "MYR",
  "timestamp": 1745571660,
  "spending_counter": 48,
  "consumer_certificate": {
    "consumer_id": "CSM-20260101-789",
    "device_id": "DEV-X-001",
    "public_key": "<X's ECDSA public key>",
    "expiry": "2026-04-26T16:00:00Z",
    "max_offline_spend_limit": 500.00,
    "ca_signature": "<CA signature over cert fields>"
  },
  "signature": "<ECDSA signature over tx_id + consumer_id + amount + currency + timestamp + spending_counter>"
}
```

**Security checks performed by Y upon receiving:**
1. ✅ Decrypt message using session key (AES-256-GCM — also verifies integrity)
2. ✅ Validate `consumer_certificate.ca_signature` using the **CA public key**
3. ✅ Check `consumer_certificate.expiry` has not passed
4. ✅ Verify `signature` using the public key from the consumer certificate
5. ✅ Verify `tx_id` is unique (not seen in local transaction log)
6. ✅ Validate `amount > 0` and within reasonable bounds
7. ✅ Check `timestamp` is within acceptable drift window

---

### Step 3 — Vendor Creates Pending Transaction Record

```
Y (Vendor) — Internal
┌─────────────────────────────────────────────────────┐
│  Transaction Record Created (LOCAL STORAGE)         │
│                                                     │
│  tx_id:          b7c9d1e3-4f5a-6b7c-8d9e-0f1a...  │
│  consumer_id:    CSM-20260101-789                   │
│  vendor_id:      VND-20260425-001                   │
│  amount:         25.50 MYR                          │
│  status:         PENDING                            │
│  created_at:     2026-04-25T16:41:00+08:00          │
│  consumer_sig:   <stored for non-repudiation>       │
│  timeout:        30 seconds                         │
└─────────────────────────────────────────────────────┘
```

> ⚠️ A **30-second timeout** is enforced. If the flow does not complete within this window, the transaction is automatically marked `EXPIRED`.

---

### Step 4 — Vendor Sends Acknowledgement to Consumer

```
X (Consumer)                                              Y (Vendor)
     |                                                         |
     |◄── [ENCRYPTED] Transaction Acknowledgement ───────────|
     |                                                         |
```

**Acknowledgement Payload (before encryption):**
```json
{
  "msg_type": "TX_ACK",
  "tx_id": "b7c9d1e3-4f5a-6b7c-8d9e-0f1a2b3c4d5e",
  "vendor_id": "VND-20260425-001",
  "amount": 25.50,
  "currency": "MYR",
  "status": "VENDOR_READY",
  "timestamp": 1745571665,
  "vendor_certificate": {
    "vendor_id": "VND-20260425-001",
    "device_id": "DEV-Y-001",
    "public_key": "<Y's ECDSA public key>",
    "merchant_name": "Kedai Kopi ABC",
    "expiry": "2026-04-26T16:00:00Z",
    "ca_signature": "<CA signature over cert fields>"
  },
  "signature": "<ECDSA signature over tx_id + vendor_id + amount + currency + status + timestamp>"
}
```

**Security checks performed by X upon receiving:**
1. ✅ Decrypt and verify integrity (AES-256-GCM)
2. ✅ Validate `vendor_certificate.ca_signature` using the **CA public key**
3. ✅ Check `vendor_certificate.expiry` has not passed
4. ✅ Verify `signature` using the public key from the vendor certificate
5. ✅ Confirm `tx_id` matches the one X originally sent
6. ✅ Confirm `amount` and `currency` match — **critical to prevent amount tampering**
7. ✅ Verify `vendor_id` matches the one from the QR code

---

### Step 5 — Consumer Deducts Balance & Sends Confirmation

```
X (Consumer) — Internal
┌─────────────────────────────────────────────────────┐
│  1. Verify remaining balance ≥ 25.50 MYR            │
│  2. Verify cumulative offline spend ≤ max limit     │
│  3. Deduct 25.50 from TEE-secured balance           │
│  4. Increment spending_counter (48 → 49) in TEE     │
│  5. Store signed transaction receipt locally         │
└─────────────────────────────────────────────────────┘
```

```
X (Consumer)                                              Y (Vendor)
     |                                                         |
     |── [ENCRYPTED] Deduction Confirmation ──────────────────►|
     |                                                         |
```

**Deduction Confirmation Payload (before encryption):**
```json
{
  "msg_type": "TX_CONFIRM",
  "tx_id": "b7c9d1e3-4f5a-6b7c-8d9e-0f1a2b3c4d5e",
  "consumer_id": "CSM-20260101-789",
  "vendor_id": "VND-20260425-001",
  "amount": 25.50,
  "currency": "MYR",
  "new_spending_counter": 49,
  "timestamp": 1745571670,
  "deduction_proof": {
    "previous_balance_hash": "SHA256:<hash of balance state before deduction>",
    "new_balance_hash": "SHA256:<hash of balance state after deduction>",
    "counter_before": 48,
    "counter_after": 49
  },
  "signature": "<ECDSA signature over ALL above fields>"
}
```

**Security checks performed by Y upon receiving:**
1. ✅ Decrypt and verify integrity (AES-256-GCM)
2. ✅ Verify `signature` using X's public key (from cached consumer certificate)
3. ✅ Confirm `tx_id`, `amount`, `vendor_id` all match the pending record
4. ✅ Verify `new_spending_counter` = `spending_counter` (from Step 2) + 1
5. ✅ Validate `deduction_proof` consistency (counter progression)

---

### Step 6 — Vendor Marks Transaction Complete & Sends Receipt

```
Y (Vendor) — Internal
┌─────────────────────────────────────────────────────┐
│  Transaction Record Updated (LOCAL STORAGE)         │
│                                                     │
│  tx_id:          b7c9d1e3-4f5a-6b7c-8d9e-0f1a...  │
│  status:         PENDING → COMPLETED                │
│  completed_at:   2026-04-25T16:41:10+08:00          │
│  consumer_sig:   <stored>                           │
│  vendor_sig:     <stored>                           │
└─────────────────────────────────────────────────────┘
```

```
X (Consumer)                                              Y (Vendor)
     |                                                         |
     |◄── [ENCRYPTED] Transaction Receipt ───────────────────|
     |                                                         |
     |  [BLE Connection Terminated]                            |
```

**Transaction Receipt Payload (before encryption):**
```json
{
  "msg_type": "TX_RECEIPT",
  "tx_id": "b7c9d1e3-4f5a-6b7c-8d9e-0f1a2b3c4d5e",
  "consumer_id": "CSM-20260101-789",
  "vendor_id": "VND-20260425-001",
  "merchant_name": "Kedai Kopi ABC",
  "amount": 25.50,
  "currency": "MYR",
  "status": "COMPLETED",
  "completed_at": "2026-04-25T16:41:10+08:00",
  "vendor_signature": "<ECDSA signature over all receipt fields>",
  "consumer_signature_ref": "<reference to X's TX_CONFIRM signature>"
}
```

**X stores this receipt locally as proof of payment.**

---

## 5. Message Schemas

### Complete Message Flow Summary

```
    X (Consumer)                                    Y (Vendor)

         │  ◄──── QR Scan ────  (out-of-band)  ────  │
         │                                            │
         │  ──── BLE Connect + ECDH Key Exchange ───► │
         │                                            │
    ┌────┼────────────── Encrypted Channel ───────────┼────┐
    │    │                                            │    │
    │    │  ── MSG 1: TX_REQUEST ────────────────────► │    │
    │    │                                            │    │
    │    │  ◄── MSG 2: TX_ACK ─────────────────────── │    │
    │    │                                            │    │
    │    │  ── MSG 3: TX_CONFIRM ───────────────────► │    │
    │    │                                            │    │
    │    │  ◄── MSG 4: TX_RECEIPT ────────────────── │    │
    │    │                                            │    │
    └────┼────────────────────────────────────────────┼────┘
         │                                            │
         │  ──── BLE Disconnect ────────────────────► │
```

### Message Type Enum

| Code | Type | Direction | Purpose |
|------|------|-----------|---------|
| `0x01` | `TX_REQUEST` | X → Y | Initiate transaction with amount and identity |
| `0x02` | `TX_ACK` | Y → X | Vendor confirms readiness |
| `0x03` | `TX_CONFIRM` | X → Y | Consumer confirms deduction with proof |
| `0x04` | `TX_RECEIPT` | Y → X | Final receipt, transaction complete |
| `0xFE` | `TX_ERROR` | Either | Error/abort with reason code |
| `0xFF` | `TX_TIMEOUT` | Either | Transaction timeout notification |

---

## 6. Error Handling & Edge Cases

### 6.1 Failure Scenarios

| Scenario | When | Recovery |
|----------|------|----------|
| **Invalid Certificate** | Steps 2 or 4 | Abort immediately. Send `TX_ERROR` with code `CERT_INVALID`. No balance is deducted. |
| **Signature Verification Failed** | Any step | Abort immediately. Send `TX_ERROR` with code `SIG_INVALID`. Possible tampering — log incident. |
| **Insufficient Balance** | Step 5 | X sends `TX_ERROR` with code `INSUFFICIENT_FUNDS`. Y marks transaction as `FAILED`. |
| **Offline Spend Limit Exceeded** | Step 5 | X sends `TX_ERROR` with code `LIMIT_EXCEEDED`. User must go online to sync and raise limit. |
| **BLE Disconnection mid-transaction** | Any step | See §6.2 below. |
| **Transaction Timeout (>30s)** | Any step | Both parties independently mark as `EXPIRED`/`TIMEOUT`. No balance deducted if before Step 5. |
| **Amount Mismatch** | Step 4 | X aborts if the echoed amount in `TX_ACK` differs from what X sent. |

### 6.2 BLE Disconnection Recovery

The critical window is **between Step 5 and Step 6** — where X has deducted balance but Y may not have received confirmation.

```
Timeline:
  Step 4 ✓ → Step 5 (X deducts) → ✗ BLE drops → Step 6 never happens

  X state: Balance deducted, has vendor ACK signature as proof
  Y state: Transaction stuck in PENDING
```

**Resolution protocol:**
1. Both devices store the transaction with status `INTERRUPTED` locally.
2. X holds a **signed `TX_CONFIRM`** message as proof of deduction intent.
3. When **either device** regains internet:
   - The signed transaction artifacts are uploaded to the backend reconciliation service.
   - The backend matches both sides using `tx_id` and validates all signatures.
   - If only X's side is received: backend holds in escrow until Y syncs.
   - If only Y's side is received: backend marks as `PENDING_CONSUMER_SYNC`.
4. **Automatic retry:** If BLE reconnects within 60 seconds, X resends the `TX_CONFIRM`.

### 6.3 Double-Spend Prevention

```
                    ┌──────────────────────────────────┐
                    │   TEE Secure Storage (Consumer)   │
                    ├──────────────────────────────────┤
                    │  balance: 474.50 MYR (encrypted)  │
                    │  spending_counter: 49 (monotonic)  │
                    │  offline_spent: 25.50 MYR          │
                    │  max_offline_limit: 500.00 MYR     │
                    └──────────────────────────────────┘

  - Counter ONLY increments (can never go backward)
  - Each transaction is bound to a specific counter value
  - Vendor rejects if counter is not exactly previous + 1
  - Cumulative offline spend is tracked and capped
```

---

## 7. Post-Transaction (When Back Online)

When either device regains internet connectivity, the following **sync operations** occur:

### 7.1 Consumer Sync (X)

1. Upload all offline transaction receipts (signed by both parties)
2. Backend verifies all signatures and counter progression
3. Backend updates the authoritative balance ledger
4. Reset `offline_spent` counter
5. Refresh certificate if nearing expiry
6. Reconcile any `INTERRUPTED` transactions

### 7.2 Vendor Sync (Y)

1. Upload all offline transaction records (with consumer signatures)
2. Backend credits vendor account for all `COMPLETED` transactions
3. Backend resolves any `INTERRUPTED` transactions via escrow
4. Refresh vendor certificate
5. Purge synced transaction logs from local storage

### 7.3 Fraud Detection (Backend)

Upon sync, the backend runs the following checks:

- **Counter gap analysis** — Missing counter values may indicate tampered transactions
- **Duplicate `tx_id` detection** — Same transaction submitted by different vendors
- **Balance integrity check** — Recalculate expected balance from all signed transactions
- **Certificate revocation** — Flag devices with expired or suspicious certificate usage
- **Velocity checks** — Unusual transaction frequency or amounts during offline window

---

## Appendix: Security Layer Summary

```
┌─────────────────────────────────────────────────────────────┐
│                    APPLICATION LAYER                         │
│  • Message signing (ECDSA)                                  │
│  • Certificate validation                                   │
│  • Business logic (balance, limits, counters)               │
├─────────────────────────────────────────────────────────────┤
│                    SESSION LAYER                             │
│  • AES-256-GCM encryption (ECDH-derived key)               │
│  • Per-message nonce                                        │
│  • Session timeout enforcement                              │
├─────────────────────────────────────────────────────────────┤
│                    TRANSPORT LAYER                           │
│  • BLE Secure Connections (LE Secure Connections)           │
│  • Randomized BLE MAC addresses                            │
│  • MTU negotiation for message chunking                    │
├─────────────────────────────────────────────────────────────┤
│                    HARDWARE LAYER                            │
│  • TEE / Secure Enclave (private keys, balance, counter)   │
│  • Hardware-bound key generation                            │
│  • Tamper detection                                        │
└─────────────────────────────────────────────────────────────┘
```
