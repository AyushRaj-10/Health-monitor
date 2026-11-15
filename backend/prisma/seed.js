import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database with initial IoMT & Patient foundation data...');

  // Upsert Clinician User
  const doctor = await prisma.user.upsert({
    where: { email: 'dr.elena.vance@iomt-health.org' },
    update: {},
    create: {
      email: 'dr.elena.vance@iomt-health.org',
      fullName: 'Dr. Elena Vance, MD',
      role: 'DOCTOR',
      department: 'Cardiology & Intensive Remote Monitoring',
    },
  });

  // Upsert Privacy Officer
  await prisma.user.upsert({
    where: { email: 'privacy.officer@iomt-health.org' },
    update: {},
    create: {
      email: 'privacy.officer@iomt-health.org',
      fullName: 'Marcus Sterling, CIPP/E',
      role: 'PRIVACY_OFFICER',
      department: 'IoMT Data Governance & Compliance',
    },
  });

  // Initial Privacy Config
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

  // Initial Sample Patients
  const patient1 = await prisma.patient.upsert({
    where: { medicalRecordNumber: 'MRN-84920' },
    update: {},
    create: {
      medicalRecordNumber: 'MRN-84920',
      fullName: 'Arthur Pendelton',
      age: 68,
      gender: 'Male',
      condition: 'Chronic Heart Failure (NYHA Class III)',
      riskLevel: 'CRITICAL',
      roomOrLocation: 'Home - Ward Telemetry Zone A',
      status: 'ACTIVE',
      assignedDoctorId: doctor.id,
    },
  });

  const patient2 = await prisma.patient.upsert({
    where: { medicalRecordNumber: 'MRN-55104' },
    update: {},
    create: {
      medicalRecordNumber: 'MRN-55104',
      fullName: 'Beatrice Chen',
      age: 54,
      gender: 'Female',
      condition: 'Post-CABG Cardiac Recovery',
      riskLevel: 'HIGH',
      roomOrLocation: 'Home - Ward Telemetry Zone B',
      status: 'ACTIVE',
      assignedDoctorId: doctor.id,
    },
  });

  // Edge Devices
  const device1 = await prisma.edgeDevice.upsert({
    where: { macAddress: '00:1B:44:11:3A:B7' },
    update: {},
    create: {
      deviceName: 'EdgeGate-BioPatch-X1',
      deviceType: 'ECG_PATCH',
      macAddress: '00:1B:44:11:3A:B7',
      edgeNodeId: 'EDGE-NODE-RPI4-01',
      status: 'ONLINE',
      batteryLevel: 88,
      patientId: patient1.id,
    },
  });

  // Sample Audit Log
  await prisma.privacyAuditLog.create({
    data: {
      action: 'SYSTEM_BOOTSTRAP',
      userId: doctor.id,
      patientId: patient1.id,
      edgeNodeId: 'EDGE-NODE-RPI4-01',
      details: 'Differential Privacy noise calibrated: ε=0.5, Laplace mechanism initialized on Edge Node 01.',
      ipAddress: '127.0.0.1',
    },
  });

  console.log('✅ Seed completed successfully.');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
