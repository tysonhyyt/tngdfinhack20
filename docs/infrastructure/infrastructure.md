# MVP Infrastructure Architecture: Global E-Wallet (Multi-Cloud)

This document outlines the infrastructure architecture for a globally scalable e-wallet application, utilizing a component-split multi-cloud strategy across AWS and Alibaba Cloud.

## 1. Architectural Strategy

We are adopting a **Component-Split Multi-Cloud Architecture** to leverage the specific strengths of two major cloud providers:
*   **AWS:** Acts as the primary compute and application entry point.
*   **Alibaba Cloud:** Serves as the high-performance data, messaging, and ledger backbone.

This hybrid approach allows the application to handle massive scale (millions of requests per minute) by isolating stateless compute from heavy data persistence.

## 2. Component Design

### 2.1 AWS (Compute & API Layer)
The AWS layer is entirely stateless and handles incoming traffic, authentication, and business logic execution.

*   **DNS & Routing:** **AWS Route 53** with latency-based routing to ensure global users connect to the nearest AWS region.
*   **API Gateway:** **Amazon API Gateway** to manage rate limiting, API keys, and route traffic to the backend services.
*   **Compute (Containers):** **AWS ECS (Fargate)** running containerized microservices (as defined in `task-definition.json`). This allows the compute layer to auto-scale instantly based on CPU/Memory utilization without managing underlying EC2 instances.
*   **Load Balancing:** **Application Load Balancers (ALB)** sitting in front of ECS to distribute traffic evenly across available container replicas.

### 2.2 Alibaba Cloud (Data & Messaging Layer)
The Alibaba layer handles high-throughput asynchronous messaging and strictly consistent financial ledger storage.

*   **Event Broker (Sync Ingestion):** **Alibaba Cloud Message Queue for Apache Kafka**. This is critical for absorbing massive spikes in traffic (e.g., when thousands of devices regain internet and sync offline transactions simultaneously).
*   **Primary Ledger Database:** **Alibaba Cloud PolarDB** (PostgreSQL-compatible). PolarDB offers immense read/write scalability necessary for a global ledger.
*   **In-Memory Cache:** **Alibaba Cloud Redis** to cache user sessions, configuration limits, and recent transaction states, drastically reducing the read load on PolarDB.

### 2.3 Network Interconnect
A critical component of this split-cloud architecture is the network latency between AWS and Alibaba.
*   **Cross-Cloud Connectivity:** We will establish a private, dedicated network link combining **AWS Direct Connect** and **Alibaba Cloud Express Connect**. 
*   **Purpose:** This bypasses the public internet, providing consistent sub-millisecond latency and significantly reducing egress bandwidth costs between the ECS application servers and the PolarDB/Kafka clusters.

## 3. High-Level Flow (Online Transaction)

1.  User makes an API request (e.g., `POST /transaction`).
2.  Route 53 directs traffic to the nearest AWS API Gateway.
3.  API Gateway forwards to ALB, which routes to an available AWS ECS container.
4.  The ECS container validates the request.
5.  If it's an online transfer, ECS connects via the Direct Connect link to Alibaba PolarDB to perform the ACID-compliant ledger transaction.
6.  A success response is returned to the user.

## 4. Scalability & Resilience

*   **Auto-Scaling Compute:** AWS ECS scales out container counts horizontally as API traffic increases.
*   **Asynchronous Processing:** By utilizing Alibaba Kafka, write-heavy operations (like offline sync ingestion) are decoupled. The database is protected from being overwhelmed during traffic spikes.
*   **High Availability:** Both AWS ECS and Alibaba PolarDB will be deployed across Multiple Availability Zones (Multi-AZ) to survive individual data center failures.
