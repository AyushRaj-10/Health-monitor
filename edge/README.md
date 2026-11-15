# IoMT Edge Computing Node

Privacy-Preserving Telemetry Ingestion & Pre-processing Subsystem for:
**Privacy-Aware Remote Patient Monitoring System using Edge Computing and IoMT**

---

## 📌 Architectural Role

In centralized IoMT systems, continuous bio-telemetry (ECG, photoplethysmography, pulse oximetry) is streamed directly to cloud databases, raising acute privacy concerns (HIPAA/GDPR compliance, potential deanonymization, and side-channel leakage) alongside massive network bandwidth overhead.

This Edge subsystem operates directly on edge nodes (e.g., Raspberry Pi 4 / hospital room gateways / secure local gateways) to provide:

1. **Ultra-Low Latency Anomaly Detection (< 25 ms)**:
   - High-rate ECG/HR spikes and hypoxic SpO2 drops are flagged locally without awaiting cloud roundtrips.
2. **Local Differential Privacy ($\epsilon, \delta$-DP)**:
   - Adds calibrated Laplace/Gaussian noise to non-critical summary statistics, mathematically bounding re-identification risk while retaining statistical utility for clinical trends.
3. **Data Minimization & Edge Filtering**:
   - Reduces continuous high-frequency 250 Hz biometric streams into compressed cryptographic envelopes, saving ~75–80% network transmission bandwidth.
4. **End-to-End Cryptography**:
   - Hardware-accelerated AES-256-GCM encryption with local session key rotation before egress to the cloud API.

---

## ⚙️ Configuration (`config/edge-node.json`)

- `edgeNodeId`: Unique hardware identifier of the local gateway.
- `privacyParameters`:
  - `epsilon` ($\epsilon$): Privacy loss budget (default `0.5`).
  - `delta` ($\delta$): Probability of arbitrary privacy failure (default `1e-5`).
  - `kAnonymity`: Grouping threshold for quasi-identifiers (default `5`).
- `edgeFiltering`:
  - `compressionRatioTarget`: Target transmission reduction ratio.

---

## 🚀 Running the Edge Simulation

```bash
cd edge
node src/edge-processor.js --simulate
```
