/**
 * Simulator Controller
 * Bridges frontend controls to the standalone IoMT Edge Simulator process.
 */

const EDGE_SIMULATOR_URL = process.env.EDGE_SIMULATOR_URL || 'http://localhost:5005';

export async function getSimulatorStatus(req, res, next) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);

    try {
      const response = await fetch(`${EDGE_SIMULATOR_URL}/api/status`, {
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (response.ok) {
        const json = await response.json();
        return res.json(json);
      }
    } catch (edgeErr) {
      clearTimeout(timeout);
    }

    // Edge simulator is not currently running
    return res.json({
      success: true,
      data: {
        online: false,
        message: 'Edge simulator background process is currently offline. Start with "npm run simulate" in edge/',
        devices: [],
        scenarios: [],
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function forwardSimulatorAction(req, res, next) {
  try {
    const { path } = req;
    const targetUrl = `${EDGE_SIMULATOR_URL}/api${path}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);

    try {
      const response = await fetch(targetUrl, {
        method: req.method,
        headers: { 'Content-Type': 'application/json' },
        body: ['POST', 'PUT', 'PATCH'].includes(req.method) ? JSON.stringify(req.body) : undefined,
        signal: controller.signal,
      });
      clearTimeout(timeout);

      const json = await response.json();
      return res.status(response.status).json(json);
    } catch (err) {
      clearTimeout(timeout);
      return res.status(503).json({
        success: false,
        error: {
          code: 'SIMULATOR_OFFLINE',
          message: 'Edge Simulator service is not responding on port 5005. Run `npm run simulate` in the edge/ directory.',
        },
      });
    }
  } catch (error) {
    next(error);
  }
}
