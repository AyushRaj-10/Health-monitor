import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding PostgreSQL database for Stage 3 IoMT Simulation & Vitals Data Collection...');

  const salt = await bcrypt.genSalt(10);
  const adminPasswordHash = await bcrypt.hash('Admin123!', salt);
  const doctorPasswordHash = await bcrypt.hash('Doctor123!', salt);
  const nursePasswordHash = await bcrypt.hash('Nurse123!', salt);

  // 1. Seed Administrator
  const admin = await prisma.user.upsert({
    where: { email: 'admin@iomt-health.org' },
    update: {
      passwordHash: adminPasswordHash,
      name: 'Dr. Gregory House, MD',
      role: 'ADMIN',
      isActive: true,
      department: 'Clinical Administration & Informatics',
    },
    create: {
      email: 'admin@iomt-health.org',
      name: 'Dr. Gregory House, MD',
      passwordHash: adminPasswordHash,
      role: 'ADMIN',
      isActive: true,
      department: 'Clinical Administration & Informatics',
    },
  });

  // 2. Seed Attending Doctor (Dr. Elena Vance)
  const doctorElena = await prisma.user.upsert({
    where: { email: 'dr.vance@iomt-health.org' },
    update: {
      passwordHash: doctorPasswordHash,
      name: 'Dr. Elena Vance, MD',
      role: 'DOCTOR',
      isActive: true,
      department: 'Cardiology & Intensive Remote Monitoring',
    },
    create: {
      email: 'dr.vance@iomt-health.org',
      name: 'Dr. Elena Vance, MD',
      passwordHash: doctorPasswordHash,
      role: 'DOCTOR',
      isActive: true,
      department: 'Cardiology & Intensive Remote Monitoring',
    },
  });

  // 3. Seed Second Doctor (Dr. Aris Thorne)
  const doctorAris = await prisma.user.upsert({
    where: { email: 'dr.thorne@iomt-health.org' },
    update: {
      passwordHash: doctorPasswordHash,
      name: 'Dr. Aris Thorne, MD',
      role: 'DOCTOR',
      isActive: true,
      department: 'Internal Medicine & Remote Rehab',
    },
    create: {
      email: 'dr.thorne@iomt-health.org',
      name: 'Dr. Aris Thorne, MD',
      passwordHash: doctorPasswordHash,
      role: 'DOCTOR',
      isActive: true,
      department: 'Internal Medicine & Remote Rehab',
    },
  });

  // 4. Seed Staff Nurse (Sarah Davis)
  await prisma.user.upsert({
    where: { email: 'nurse.davis@iomt-health.org' },
    update: {
      passwordHash: nursePasswordHash,
      name: 'Sarah Davis, RN',
      role: 'NURSE',
      isActive: true,
      department: 'Tele-ICU Monitoring Ward',
    },
    create: {
      email: 'nurse.davis@iomt-health.org',
      name: 'Sarah Davis, RN',
      passwordHash: nursePasswordHash,
      role: 'NURSE',
      isActive: true,
      department: 'Tele-ICU Monitoring Ward',
    },
  });

  // 5. Initial Privacy Config
  const existingConfig = await prisma.privacyConfig.findFirst();
  if (!existingConfig) {
    await prisma.privacyConfig.create({
      data: {
        differentialPrivacyEnabled: true,
        epsilon: 0.5,
        delta: 0.00001,
        anonymizationLevel: 'K-Anonymity (k=5) + Laplace DP',
        edgeBandwidthSavingPercent: 78.4,
      },
    });
  }

  // 6. Seed Initial Patients
  const patientsData = [
    {
      patientCode: 'PAT-84920',
      name: 'Arthur Pendelton',
      dateOfBirth: new Date('1958-04-12'),
      gender: 'Male',
      contactInformation: '+1 (555) 234-8901 • arthur.pendelton@example.com',
      assignedDoctorId: doctorElena.id,
      condition: 'Chronic Heart Failure (NYHA Class III)',
      riskLevel: 'CRITICAL',
      roomOrLocation: 'Home Care - Ward Telemetry Zone A',
      status: 'ACTIVE',
      medicalHistory: 'Diagnosed with ischemic cardiomyopathy in 2021. Bilateral leg edema managed with furosemide. Implanted biventricular pacemaker. Allergic to penicillin.',
    },
    {
      patientCode: 'PAT-55104',
      name: 'Beatrice Chen',
      dateOfBirth: new Date('1972-08-25'),
      gender: 'Female',
      contactInformation: '+1 (555) 345-6712 • beatrice.chen@example.com',
      assignedDoctorId: doctorElena.id,
      condition: 'Post-CABG Cardiac Recovery',
      riskLevel: 'HIGH',
      roomOrLocation: 'Home Care - Ward Telemetry Zone B',
      status: 'ACTIVE',
      medicalHistory: 'Coronary artery bypass graft (x3) performed 4 weeks ago. Strict remote cardiac rehab monitoring. Mild ambulatory oxygen desaturation on exertion.',
    },
    {
      patientCode: 'PAT-91244',
      name: 'Marcus Aurelius Sterling',
      dateOfBirth: new Date('1954-11-03'),
      gender: 'Male',
      contactInformation: '+1 (555) 456-7890 • m.sterling@example.com',
      assignedDoctorId: doctorAris.id,
      condition: 'Atrial Fibrillation & Hypertension',
      riskLevel: 'CRITICAL',
      roomOrLocation: 'Specialized Tele-ICU Ward 3',
      status: 'ACTIVE',
      medicalHistory: 'Permanent atrial fibrillation on direct oral anticoagulants. Resistant essential hypertension. Monitored with Holter wearable sensor.',
    },
    {
      patientCode: 'PAT-33019',
      name: 'Sophia Rodriguez',
      dateOfBirth: new Date('1985-02-18'),
      gender: 'Female',
      contactInformation: '+1 (555) 567-8901 • s.rodriguez@example.com',
      assignedDoctorId: doctorElena.id,
      condition: 'Post-Viral Myocarditis Monitoring',
      riskLevel: 'MODERATE',
      roomOrLocation: 'Outpatient Tele-Monitoring Unit',
      status: 'ACTIVE',
      medicalHistory: 'Viral myocarditis post-coxsackie infection. Left ventricular ejection fraction restored to 52%. Continuous wearable smartwatch biometrics.',
    },
    {
      patientCode: 'PAT-72418',
      name: 'David K. O’Connor',
      dateOfBirth: new Date('1963-07-30'),
      gender: 'Male',
      contactInformation: '+1 (555) 678-9012 • david.oconnor@example.com',
      assignedDoctorId: doctorAris.id,
      condition: 'COPD with Cor Pulmonale',
      riskLevel: 'HIGH',
      roomOrLocation: 'Home Care - Ward Telemetry Zone C',
      status: 'ACTIVE',
      medicalHistory: 'Stage 3 COPD with secondary pulmonary arterial hypertension. Baseline SpO2 91-93%. Nocturnal supplemental oxygen titration.',
    },
    {
      patientCode: 'PAT-18452',
      name: 'Evelyn Vasquez',
      dateOfBirth: new Date('1997-09-14'),
      gender: 'Female',
      contactInformation: '+1 (555) 789-0123 • evelyn.v@example.com',
      assignedDoctorId: doctorAris.id,
      condition: 'Gestational Arrhythmia Telemetry',
      riskLevel: 'LOW',
      roomOrLocation: 'Remote Maternal Clinic',
      status: 'ACTIVE',
      medicalHistory: '28-week primigravida experiencing benign premature ventricular contractions. Ambulatory telemetry for maternal-fetal reassurance.',
    },
    {
      patientCode: 'PAT-60911',
      name: 'Harold J. Finch',
      dateOfBirth: new Date('1947-12-05'),
      gender: 'Male',
      contactInformation: '+1 (555) 890-1234 • harold.finch@example.com',
      assignedDoctorId: doctorElena.id,
      condition: 'Pacemaker Implantation Follow-up',
      riskLevel: 'MODERATE',
      roomOrLocation: 'Cardiac Step-Down Telemetry',
      status: 'ACTIVE',
      medicalHistory: 'Dual-chamber pacemaker inserted October 2026 for sick sinus syndrome. Remote RF interrogator transmitting edge-aggregated pacing telemetry.',
    },
  ];

  const seededPatients = {};
  for (const p of patientsData) {
    const record = await prisma.patient.upsert({
      where: { patientCode: p.patientCode },
      update: p,
      create: p,
    });
    seededPatients[p.patientCode] = record;
  }
  console.log(`✅ Seeded ${patientsData.length} patient records.`);

  // 7. Seed IoMT Devices associated with Patients
  const devicesData = [
    {
      deviceCode: 'DEV-1001',
      name: 'PulseGuard Continuous ECG Patch',
      deviceType: 'ECG_PATCH',
      status: 'ONLINE',
      batteryLevel: 88,
      firmwareVersion: 'v2.4.1-sim',
      edgeNodeId: 'EDGE-GATEWAY-RPI4-01',
      apiKey: 'dev_key_arthur_ecg_84920',
      patientId: seededPatients['PAT-84920']?.id,
      isSimulated: true,
    },
    {
      deviceCode: 'DEV-1002',
      name: 'PulseGuard Ambulatory SpO2 Clip',
      deviceType: 'PULSE_OXIMETER',
      status: 'ONLINE',
      batteryLevel: 74,
      firmwareVersion: 'v2.4.1-sim',
      edgeNodeId: 'EDGE-GATEWAY-RPI4-01',
      apiKey: 'dev_key_beatrice_spo2_55104',
      patientId: seededPatients['PAT-55104']?.id,
      isSimulated: true,
    },
    {
      deviceCode: 'DEV-1003',
      name: 'IoMT Smart Holter Streamer',
      deviceType: 'SMARTWATCH',
      status: 'ONLINE',
      batteryLevel: 62,
      firmwareVersion: 'v2.3.9-sim',
      edgeNodeId: 'EDGE-GATEWAY-RPI4-02',
      apiKey: 'dev_key_marcus_holter_91244',
      patientId: seededPatients['PAT-91244']?.id,
      isSimulated: true,
    },
    {
      deviceCode: 'DEV-1004',
      name: 'Medical Multi-Param Smartwatch',
      deviceType: 'SMARTWATCH',
      status: 'ONLINE',
      batteryLevel: 95,
      firmwareVersion: 'v2.4.1-sim',
      edgeNodeId: 'EDGE-GATEWAY-RPI4-03',
      apiKey: 'dev_key_sophia_watch_33019',
      patientId: seededPatients['PAT-33019']?.id,
      isSimulated: true,
    },
    {
      deviceCode: 'DEV-1005',
      name: 'Continuous Respiratory & BP Cuff',
      deviceType: 'BP_CUFF',
      status: 'ONLINE',
      batteryLevel: 45,
      firmwareVersion: 'v2.4.1-sim',
      edgeNodeId: 'EDGE-GATEWAY-RPI4-02',
      apiKey: 'dev_key_david_bp_72418',
      patientId: seededPatients['PAT-72418']?.id,
      isSimulated: true,
    },
  ];

  const seededDevices = {};
  for (const d of devicesData) {
    const dev = await prisma.device.upsert({
      where: { deviceCode: d.deviceCode },
      update: d,
      create: d,
    });
    seededDevices[d.deviceCode] = dev;
  }
  console.log(`✅ Seeded ${devicesData.length} IoMT devices with secure API keys.`);

  // 8. Seed initial historical Vital Readings (for patient PAT-84920 and others)
  const arthur = seededPatients['PAT-84920'];
  const arthurDevice = seededDevices['DEV-1001'];

  if (arthur && arthurDevice) {
    const now = Date.now();
    const readings = [];
    // Generate 12 readings spread across the past 2 hours
    for (let i = 12; i >= 0; i--) {
      const timeOffset = i * 10 * 60 * 1000; // every 10 mins
      const isElevated = i <= 3; // recent readings show elevated HR
      readings.push({
        patientId: arthur.id,
        deviceId: arthurDevice.id,
        heartRate: isElevated ? 112 + Math.floor(Math.random() * 8) : 76 + Math.floor(Math.random() * 8),
        spo2: isElevated ? 92.5 : 97.5,
        bloodPressureSys: isElevated ? 144 : 122,
        bloodPressureDia: isElevated ? 92 : 82,
        temperature: 36.8 + (Math.random() * 0.4 - 0.2),
        respiratoryRate: isElevated ? 22 : 16,
        isSimulated: true,
        scenario: isElevated ? 'WARNING_ELEVATED_HR' : 'NORMAL',
        recordedAt: new Date(now - timeOffset),
      });
    }

    for (const r of readings) {
      await prisma.vitalReading.create({ data: r });
    }
    console.log(`✅ Seeded ${readings.length} historical vital readings for Arthur Pendelton.`);
  }

  console.log('🎉 Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
