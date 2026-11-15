/**
 * IoMT Edge Physiology Engine
 * 
 * Simulates human cardiopulmonary & systemic hemodynamics with realistic
 * baselines, gradual Markovian drift, and configurable clinical anomaly scenarios.
 */

export const SCENARIO_PRESETS = {
  NORMAL: {
    name: 'Normal Baseline (Resting Adult)',
    description: 'Hemodynamically stable resting state with healthy sinus rhythm.',
    target: {
      heartRate: 74,
      spo2: 98,
      bloodPressureSys: 120,
      bloodPressureDia: 80,
      temperature: 36.8,
      respiratoryRate: 16,
    },
    bounds: {
      heartRate: [64, 82],
      spo2: [96, 100],
      bloodPressureSys: [112, 128],
      bloodPressureDia: [72, 84],
      temperature: [36.5, 37.1],
      respiratoryRate: [13, 19],
    },
    noise: {
      heartRate: 1.5,
      spo2: 0.4,
      bloodPressureSys: 1.8,
      bloodPressureDia: 1.2,
      temperature: 0.05,
      respiratoryRate: 0.8,
    },
  },

  WARNING_ELEVATED_HR: {
    name: 'Elevated Heart Rate / Mild Distress',
    description: 'Moderate sinus tachycardia, patient exerting or mildly agitated.',
    target: {
      heartRate: 110,
      spo2: 96,
      bloodPressureSys: 134,
      bloodPressureDia: 86,
      temperature: 37.3,
      respiratoryRate: 20,
    },
    bounds: {
      heartRate: [100, 122],
      spo2: [94, 98],
      bloodPressureSys: [126, 142],
      bloodPressureDia: [82, 92],
      temperature: [37.0, 37.6],
      respiratoryRate: [18, 23],
    },
    noise: {
      heartRate: 2.0,
      spo2: 0.5,
      bloodPressureSys: 2.2,
      bloodPressureDia: 1.5,
      temperature: 0.06,
      respiratoryRate: 1.0,
    },
  },

  CRITICAL_TACHYCARDIA: {
    name: 'Critical Paroxysmal Tachycardia',
    description: 'Dangerous heart rate elevation (>145 bpm) with hemodynamic strain.',
    target: {
      heartRate: 154,
      spo2: 93,
      bloodPressureSys: 152,
      bloodPressureDia: 98,
      temperature: 37.3,
      respiratoryRate: 26,
    },
    bounds: {
      heartRate: [140, 172],
      spo2: [91, 95],
      bloodPressureSys: [142, 166],
      bloodPressureDia: [90, 106],
      temperature: [37.0, 37.7],
      respiratoryRate: [23, 30],
    },
    noise: {
      heartRate: 3.0,
      spo2: 0.6,
      bloodPressureSys: 2.5,
      bloodPressureDia: 2.0,
      temperature: 0.08,
      respiratoryRate: 1.2,
    },
  },

  HYPOXIA: {
    name: 'Severe Hypoxemia / Respiratory Depression',
    description: 'Critical drop in oxygen saturation (SpO2 < 90%) with compensatory tachypnea.',
    target: {
      heartRate: 108,
      spo2: 87,
      bloodPressureSys: 112,
      bloodPressureDia: 72,
      temperature: 36.7,
      respiratoryRate: 28,
    },
    bounds: {
      heartRate: [96, 120],
      spo2: [82, 89],
      bloodPressureSys: [104, 122],
      bloodPressureDia: [66, 78],
      temperature: [36.4, 37.1],
      respiratoryRate: [24, 34],
    },
    noise: {
      heartRate: 2.2,
      spo2: 0.8,
      bloodPressureSys: 2.0,
      bloodPressureDia: 1.5,
      temperature: 0.05,
      respiratoryRate: 1.5,
    },
  },

  HYPERTENSIVE_CRISIS: {
    name: 'Acute Hypertensive Crisis',
    description: 'Severe systolic (>180 mmHg) and diastolic (>110 mmHg) arterial hypertension.',
    target: {
      heartRate: 98,
      spo2: 96,
      bloodPressureSys: 188,
      bloodPressureDia: 116,
      temperature: 36.9,
      respiratoryRate: 20,
    },
    bounds: {
      heartRate: [88, 110],
      spo2: [94, 98],
      bloodPressureSys: [176, 204],
      bloodPressureDia: [108, 128],
      temperature: [36.6, 37.3],
      respiratoryRate: [17, 24],
    },
    noise: {
      heartRate: 2.0,
      spo2: 0.5,
      bloodPressureSys: 3.0,
      bloodPressureDia: 2.2,
      temperature: 0.05,
      respiratoryRate: 1.0,
    },
  },

  FEVER_INFECTION: {
    name: 'Febrile State / Systemic Infection',
    description: 'Elevated core body temperature (>38.8°C) with compensatory tachycardia.',
    target: {
      heartRate: 116,
      spo2: 95,
      bloodPressureSys: 124,
      bloodPressureDia: 80,
      temperature: 39.2,
      respiratoryRate: 23,
    },
    bounds: {
      heartRate: [106, 128],
      spo2: [93, 97],
      bloodPressureSys: [116, 134],
      bloodPressureDia: [74, 86],
      temperature: [38.7, 39.8],
      respiratoryRate: [20, 27],
    },
    noise: {
      heartRate: 2.2,
      spo2: 0.5,
      bloodPressureSys: 2.0,
      bloodPressureDia: 1.5,
      temperature: 0.1,
      respiratoryRate: 1.2,
    },
  },
};

/**
 * Creates an instance of the physiology generator for a specific patient/device
 */
export class PhysiologyEngine {
  constructor(initialScenario = 'NORMAL') {
    this.scenario = SCENARIO_PRESETS[initialScenario] ? initialScenario : 'NORMAL';
    const preset = SCENARIO_PRESETS[this.scenario];

    // Initialize current vitals at the preset target with slight random jitter
    this.current = {
      heartRate: preset.target.heartRate + (Math.random() * 4 - 2),
      spo2: preset.target.spo2 + (Math.random() * 1.5 - 0.75),
      bloodPressureSys: preset.target.bloodPressureSys + (Math.random() * 4 - 2),
      bloodPressureDia: preset.target.bloodPressureDia + (Math.random() * 3 - 1.5),
      temperature: preset.target.temperature + (Math.random() * 0.2 - 0.1),
      respiratoryRate: preset.target.respiratoryRate + (Math.random() * 2 - 1),
    };
  }

  setScenario(scenarioKey) {
    if (SCENARIO_PRESETS[scenarioKey]) {
      this.scenario = scenarioKey;
      return true;
    }
    return false;
  }

  getScenario() {
    return this.scenario;
  }

  /**
   * Generates the next realistic telemetry reading with smooth Markovian drift
   * toward the active scenario targets.
   */
  tick() {
    const preset = SCENARIO_PRESETS[this.scenario];
    const { target, bounds, noise } = preset;

    // Smoothing factor (0.18 = gradual physiological transition without jarring step changes)
    const inertia = 0.18;

    // Heart Rate
    const hrNoise = (Math.random() * 2 - 1) * noise.heartRate;
    this.current.heartRate = this.current.heartRate + (target.heartRate - this.current.heartRate) * inertia + hrNoise;
    this.current.heartRate = Math.max(bounds.heartRate[0], Math.min(bounds.heartRate[1], this.current.heartRate));

    // SpO2
    const spo2Noise = (Math.random() * 2 - 1) * noise.spo2;
    this.current.spo2 = this.current.spo2 + (target.spo2 - this.current.spo2) * inertia + spo2Noise;
    this.current.spo2 = Math.max(bounds.spo2[0], Math.min(bounds.spo2[1], this.current.spo2));

    // Blood Pressure Systolic
    const sysNoise = (Math.random() * 2 - 1) * noise.bloodPressureSys;
    this.current.bloodPressureSys = this.current.bloodPressureSys + (target.bloodPressureSys - this.current.bloodPressureSys) * inertia + sysNoise;
    this.current.bloodPressureSys = Math.max(bounds.bloodPressureSys[0], Math.min(bounds.bloodPressureSys[1], this.current.bloodPressureSys));

    // Blood Pressure Diastolic
    const diaNoise = (Math.random() * 2 - 1) * noise.bloodPressureDia;
    this.current.bloodPressureDia = this.current.bloodPressureDia + (target.bloodPressureDia - this.current.bloodPressureDia) * inertia + diaNoise;
    this.current.bloodPressureDia = Math.max(bounds.bloodPressureDia[0], Math.min(bounds.bloodPressureDia[1], this.current.bloodPressureDia));

    // Temperature (°C)
    const tempNoise = (Math.random() * 2 - 1) * noise.temperature;
    this.current.temperature = this.current.temperature + (target.temperature - this.current.temperature) * (inertia * 0.5) + tempNoise;
    this.current.temperature = Math.max(bounds.temperature[0], Math.min(bounds.temperature[1], this.current.temperature));

    // Respiratory Rate
    const respNoise = (Math.random() * 2 - 1) * noise.respiratoryRate;
    this.current.respiratoryRate = this.current.respiratoryRate + (target.respiratoryRate - this.current.respiratoryRate) * inertia + respNoise;
    this.current.respiratoryRate = Math.max(bounds.respiratoryRate[0], Math.min(bounds.respiratoryRate[1], this.current.respiratoryRate));

    return {
      heartRate: Math.round(this.current.heartRate),
      spo2: Math.min(100, Math.round(this.current.spo2)),
      bloodPressureSys: Math.round(this.current.bloodPressureSys),
      bloodPressureDia: Math.round(this.current.bloodPressureDia),
      temperature: Number(this.current.temperature.toFixed(1)),
      respiratoryRate: Math.round(this.current.respiratoryRate),
      scenario: this.scenario,
      isSimulated: true,
      recordedAt: new Date().toISOString(),
    };
  }
}
