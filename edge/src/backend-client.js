/**
 * IoMT Edge Backend Communication Client
 * 
 * Handles authenticated telemetry ingestion and local alert reporting with RTT latency benchmarking.
 */

export class BackendClient {
  constructor(baseUrl = 'http://localhost:5001/api') {
    this.baseUrl = baseUrl;
  }

  setBaseUrl(url) {
    this.baseUrl = url;
  }

  /**
   * Transmits vital readings to backend
   */
  async ingestVitals(payload) {
    const start = performance.now();
    try {
      const res = await fetch(`${this.baseUrl}/vitals/ingest`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': `IoMT-EdgeGateway/${payload.deviceId || 'GATEWAY'}`,
        },
        body: JSON.stringify(payload),
      });

      const rttMs = Number((performance.now() - start).toFixed(2));
      const data = await res.json();

      if (!res.ok) {
        return {
          success: false,
          status: res.status,
          error: data.error?.message || `HTTP ${res.status}`,
          rttMs,
        };
      }

      return {
        success: true,
        status: res.status,
        data,
        rttMs,
      };
    } catch (err) {
      const rttMs = Number((performance.now() - start).toFixed(2));
      return {
        success: false,
        isNetworkError: true,
        error: err.message,
        rttMs,
      };
    }
  }

  /**
   * Transmits locally detected alert to backend
   */
  async reportAlert(alertPayload) {
    const start = performance.now();
    try {
      const res = await fetch(`${this.baseUrl}/alerts/ingest`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(alertPayload),
      });

      const rttMs = Number((performance.now() - start).toFixed(2));
      const data = await res.json();

      return {
        success: res.ok,
        status: res.status,
        data,
        rttMs,
      };
    } catch (err) {
      return {
        success: false,
        isNetworkError: true,
        error: err.message,
        rttMs: Number((performance.now() - start).toFixed(2)),
      };
    }
  }
}
