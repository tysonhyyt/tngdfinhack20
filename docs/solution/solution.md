# Offline Transaction & Synchronization Solution Design

This document details the solution design for the e-wallet's offline transaction capability, specifically addressing synchronization logic, edge cases, and fraud prevention upon restoring internet connectivity.

## 1. Core Principles

*   **Optimistic Execution:** To prioritize user and vendor experience, transactions are executed immediately upon sync by *either* party.
*   **Vendor Guarantee:** The system ensures the vendor always receives their funds if the offline transaction cryptographically checks out, regardless of the consumer's online balance.
*   **Event-Driven Scale:** System handles reconnection spikes using asynchronous message queues.

## 2. Security & Fraud Prevention

### 2.1 Biometric TEE Authorization
All offline transactions require **Strict Biometric Authentication** (Fingerprint/FaceID) to execute.
*   The cryptographic private key is locked inside the device's Trusted Execution Environment (TEE).
*   The TEE will only sign the `TX_CONFIRM` payload if the biometric prompt succeeds. This prevents thieves from spending funds on a stolen device.

### 2.2 User-Configurable Certificate Expiry
To prevent "First-Party Fraud" (the Ghost Device scenario where a user purposely revokes a device and tries to spend offline later), the system utilizes short-lived offline certificates.
*   The `certificate_expiry` is configurable by the user (e.g., 24 hours, 3 days, 14 days).
*   Any changes to this configuration require biometric authorization.
*   Once a device is mathematically expired, the vendor's app will reject the transaction entirely.

### 2.3 Single Device Policy & Revocation
*   A user can only be logged into one device at a time.
*   Logging into a new device automatically issues a revocation command to the backend for the previous device.
*   If the revoked device is offline, it can only spend until its locally configurable `certificate_expiry` is reached.

## 3. Synchronization Flow (Event-Driven)

To support millions of global users reconnecting and syncing simultaneously, the synchronization flow is entirely event-driven.

1.  **Reconnection:** Device regains internet access.
2.  **API Ingestion:** Device pushes an array of signed offline transaction artifacts (Receipts, Proofs) to the AWS API Gateway.
3.  **Queueing:** The API immediately dumps the payload into an **Alibaba Cloud Kafka** topic and returns a `202 Accepted` to the mobile client.
4.  **Async Processing:** ECS Worker containers consume from Kafka at a controlled rate to prevent database crashes.

## 4. Ledger Execution & Optimistic Processing

Transactions are processed based on an "Optimistic" model where the first party to sync triggers the execution.

*   **Consumer Syncs First:** If the Consumer (X) uploads the transaction but the Vendor (Y) is still offline, the backend verifies the consumer's cryptographic proof. It then **immediately credits the Vendor's online ledger** and deducts the Consumer's balance.
*   **Vendor Syncs First:** If the Vendor (Y) uploads the transaction, the backend verifies the signature, credits the Vendor, and deducts the Consumer.
*   **Duplicate Uploads:** If the transaction was already executed by the other party's sync, the backend detects the duplicate `tx_id`, marks the transaction as completely "Secured", and ignores the redundant ledger operations.

## 5. Overspending & The Loan Feature

Due to the nature of offline transactions, a consumer might spend their balance online while their offline device is disconnected.

1.  **Overspend Detection:** During async processing, if deducting the offline transaction amount drops the consumer's online balance below zero, the transaction is STILL APPROVED.
2.  **Vendor Protection:** The vendor's ledger is credited the full amount immediately.
3.  **Loan Activation:** The consumer's account is automatically placed into the "Loan" state for the overdrawn amount.
4.  **Asynchronous Notification:** The backend triggers an immediate Push Notification and SMS to the consumer: *"Your offline transaction at [Vendor] was processed. Because your balance was insufficient, the remaining amount has been transferred to your Loan account."*

## 6. Fraud Detection & Manual Review

During the Kafka worker processing, the backend runs automated fraud checks:
*   **Counter Integrity:** Ensures the `spending_counter` increments sequentially without gaps.
*   **Velocity Checks:** Flags unusually rapid offline transactions.
*   **Signature Tampering:** Verifies all ECDSA signatures against the CA.

**Action:** If fraud is suspected (e.g., skipped counters or invalid signatures), the transaction is flagged and routed to a dedicated queue for **Manual Operations Review**. The system does not automatically suspend accounts, allowing human operators to investigate potential edge cases or bugs before taking punitive action.
