# Global E-Wallet: Application Specifications

## 1. Project Overview

*   **Project Name:** Global E-Wallet (Offline Transaction MVP)
*   **Purpose & Business Problem:** The application aims to create a highly scalable e-wallet MVP that supports secure, strictly offline transactions. In regions or situations with zero internet connectivity, consumers and vendors can still transact securely. The solution guarantees vendor funds, mitigates double-spending, and handles the "Ghost Device" first-party fraud vulnerability through a combination of TEE (Trusted Execution Environment) biometrics and user-configurable short-lived certificates.
*   **Target Users:** Global consumers (payers) and merchants/vendors (payees).
*   **High-Level Architecture:** 
    *   **Mobile Clients:** Utilize Bluetooth Low Energy (BLE) for peer-to-peer offline communication, backed by hardware-level TEE for cryptographic signing and certificate validation.
    *   **Backend (Multi-Cloud):** A Component-Split Multi-Cloud architecture. AWS handles the stateless, auto-scaling compute and API ingress (Route 53, API Gateway, ECS Fargate). Alibaba Cloud serves as the heavy data and messaging backbone (Kafka, PolarDB, Redis), interconnected via a dedicated private network link.

---

## 2. Suggested Tech Stack

*   **Programming Languages:**
    *   **Backend:** TypeScript / Node.js
    *   **Mobile:** Dart (Flutter) or Kotlin/Swift (if native TEE integration demands it)
*   **Frameworks and Libraries:**
    *   **Backend:** NestJS or Express.js (for structured, scalable microservices)
    *   **Mobile:** CoreBluetooth / Android BLE API, WebCrypto API (for AES-GCM and ECDSA)
*   **Databases:**
    *   **Primary Ledger:** Alibaba Cloud PolarDB (PostgreSQL-compatible, ACID compliant)
    *   **Caching & State:** Alibaba Cloud Redis
*   **Cloud Services:**
    *   **AWS (Compute Layer):** Route 53, API Gateway, Application Load Balancer (ALB), Elastic Container Service (ECS Fargate), Elastic Container Registry (ECR).
    *   **Alibaba Cloud (Data Layer):** Message Queue for Apache Kafka, PolarDB, Redis.
    *   **Networking:** AWS Direct Connect & Alibaba Cloud Express Connect.
*   **External Integration:** Hardware Biometrics (FaceID / Fingerprint) linked to Secure Enclave / StrongBox.

---

## 3. Architecture and Design

### 3.1 Overall Architecture Style
*   **Event-Driven Microservices:** The backend utilizes an event-driven pattern using Kafka to handle massive spikes in transaction synchronization when devices come online.
*   **Clean/Hexagonal Architecture:** Internally, backend services should decouple business logic (Ledger rules, Fraud detection) from infrastructural concerns (Kafka consumers, Database repositories).

### 3.2 Key Components & Responsibilities
*   **Mobile App (Consumer/Vendor):** Manages local TEE keys, generates BLE QR codes, handles encrypted BLE sessions, deducts local offline balance, and queues transactions for online sync.
*   **AWS API Ingress (Gateway/ALB):** Authenticates online requests, handles SSL termination, and routes traffic.
*   **ECS Sync Workers (AWS):** Consume offline transaction payloads from Kafka, verify ECDSA signatures, check certificate validity, and process ledger updates optimisticly.
*   **Ledger Database (Alibaba PolarDB):** The single source of truth for all balances, spending counters, and account limits.

### 3.3 Suggested Folder/Repository Design
```text
/backend
├── src/
│   ├── modules/
│   │   ├── ledger/            # Core balance and transfer logic
│   │   ├── transaction/       # Online and offline sync processing
│   │   ├── cryptography/      # Certificate validation and signature checks
│   │   └── notification/      # Push/SMS alerts (e.g., Loan activation)
│   ├── infrastructure/        # Kafka consumers, DB connections, Redis clients
│   └── main.ts                # App entry point
├── Dockerfile                 # ECS deployment container config
└── package.json
```

### 3.4 Data Flow Overview (Offline Transaction Lifecycle)
1.  **Pre-Condition (Online):** App generates TEE keys, backend issues an `App Cert` with `certificate_expiry` and `max_offline_spend_limit`.
2.  **QR Scan & BLE Connect (Offline):** Consumer scans Vendor QR; secure BLE connection established via ECDH key exchange.
3.  **Transaction Request (Offline):** Consumer sends encrypted intent (amount, cert). Vendor verifies.
4.  **Confirmation (Offline):** Consumer authenticates via Biometrics, unlocking TEE. TEE signs `TX_CONFIRM`. Balance deducted locally.
5.  **Receipt (Offline):** Vendor verifies Consumer signature, marks `COMPLETED`, returns `TX_RECEIPT`.
6.  **Synchronization (Online):** *Either* party connects to the internet and pushes the payload to AWS API Gateway -> Kafka.
7.  **Optimistic Execution (Backend):** Kafka worker verifies cryptographic proof. Vendor is credited immediately. Consumer is deducted (if overdrawn, triggers Loan state and notifications).

---

## 4. Data Models

### 4.1 Core Entities (DTOs)

**1. Account (Ledger)**
*   `account_id` (UUID, PK)
*   `user_id` (UUID, FK)
*   `balance` (Decimal)
*   `loan_balance` (Decimal)
*   `spending_counter` (Integer, Monotonic)
*   `max_offline_limit` (Decimal)

**2. OfflineTransaction (Sync Record)**
*   `tx_id` (UUID, PK)
*   `consumer_id` (String)
*   `vendor_id` (String)
*   `amount` (Decimal)
*   `currency` (String)
*   `status` (Enum: `PENDING`, `COMPLETED`, `INTERRUPTED`, `SECURED`, `FLAGGED`)
*   `consumer_signature` (String)
*   `vendor_signature` (String)
*   `timestamp` (Timestamp)

**3. DeviceCertificate**
*   `cert_id` (UUID, PK)
*   `device_id` (String)
*   `public_key` (String)
*   `expiry_date` (Timestamp)
*   `is_revoked` (Boolean)

### 4.2 Validation Rules
*   **Counters:** `spending_counter` MUST be strictly sequential (`previous + 1`).
*   **Signatures:** All signatures must be validated against the public key attached to the CA-signed certificate.
*   **Expiration:** Certificates must be checked against `expiry_date` locally before any offline transaction.

---

## 5. Error Handling

### 5.1 Global Strategy
*   **Offline:** Custom binary or short-string error codes exchanged over BLE (e.g., `0xFE`).
*   **Online/API:** Standard HTTP status codes (400, 401, 403, 404, 500) wrapping a consistent JSON error format.
*   **Fraud:** Errors related to tampering or skipped counters are not returned to the client as standard errors, but instead return a `202 Accepted` while silently moving the transaction to a `FLAGGED` manual review queue.

### 5.2 Common Error Codes
*   `CERT_INVALID`: Certificate expired or signature mismatch.
*   `SIG_INVALID`: Payload tampering detected.
*   `INSUFFICIENT_FUNDS`: Consumer offline balance exhausted.
*   `LIMIT_EXCEEDED`: Offline transaction size exceeds `max_offline_spend_limit`.

### 5.3 Sample Error Response (API)
```json
{
  "success": false,
  "error": {
    "code": "LIMIT_EXCEEDED",
    "message": "Transaction exceeds the maximum allowed offline spend limit.",
    "timestamp": "2026-04-25T10:00:00Z"
  }
}
```

---

## 6. Deployment

### 6.1 Deployment Strategy (GitHub Actions to ECS)
The backend leverages an automated CI/CD pipeline using GitHub Actions to deploy to AWS Elastic Container Service (ECS) via AWS Fargate.

### 6.2 CI/CD Overview
1.  **Code Commit:** Developer pushes to `main`.
2.  **Test & Lint:** GitHub Actions runs unit tests, integration tests, and static analysis.
3.  **Build:** Docker image is built using the project's `Dockerfile`.
4.  **Push:** Image is tagged and pushed to Amazon Elastic Container Registry (ECR).
5.  **Deploy:** GitHub Actions updates the `task-definition.json` with the new image URI and forces a rolling update on the ECS Cluster, ensuring zero-downtime deployment.

### 6.3 Infrastructure
*   Infrastructure as Code (IaC) via Terraform or AWS CloudFormation is assumed to provision the Route 53, API Gateway, ALB, ECS Clusters, and the AWS Direct Connect networking routing to Alibaba Cloud.

---

## 7. Assumptions & Limitations

### 7.1 Assumptions
*   **Biometric Support:** It is assumed that all target devices support secure biometric APIs linked directly to a Trusted Execution Environment (TEE).
*   **Vendor Trust:** Vendors will accept optimistic execution. We assume the cryptographically signed receipts from the consumer's TEE are legally binding.
*   **Cross-Cloud Connectivity:** It is assumed that the budget permits setting up a dedicated Direct Connect/Express Connect pipeline to mitigate latency.

### 7.2 Known Limitations
*   **Latency Overhead:** Even with Direct Connect, calls between AWS compute and Alibaba Cloud databases will have higher latency (e.g., 5-20ms depending on physical data center locations) compared to a single-cloud architecture.
*   **First-Party Fraud Vulnerability Window:** A revoked device can still spend offline until its local `certificate_expiry` is reached. (Mitigated heavily by Biometrics, but technically possible if the owner bypasses their own biometrics).

### 7.3 Suggested Enhancements
*   **Dynamic Certificate Expiry:** Adjust the certificate lifespan based on user risk profiles using machine learning (e.g., highly trusted users get 7 days, new users get 12 hours).
*   **Mesh Networking:** Allow offline devices to relay synced transactions through *other* nearby devices that happen to have internet (acting as internet gateways) to speed up synchronization.
