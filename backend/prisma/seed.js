import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding PostgreSQL database for Stage 2 Authentication & Patient Management...');

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

  // 2. Seed Attending Cardiologist (Doctor)
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

  // 3. Seed Second Doctor
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

  // 4. Seed Staff Nurse
  const nurseSarah = await prisma.user.upsert({
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

  console.log('✅ Users seeded:');
  console.log('   - Admin:   admin@iomt-health.org (Password: Admin123!)');
  console.log('   - Doctor:  dr.vance@iomt-health.org (Password: Doctor123!)');
  console.log('   - Doctor:  dr.thorne@iomt-health.org (Password: Doctor123!)');
  console.log('   - Nurse:   nurse.davis@iomt-health.org (Password: Nurse123!)');

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

  for (const p of patientsData) {
    await prisma.patient.upsert({
      where: { patientCode: p.patientCode },
      update: {
        name: p.name,
        dateOfBirth: p.dateOfBirth,
        gender: p.gender,
        contactInformation: p.contactInformation,
        assignedDoctorId: p.assignedDoctorId,
        condition: p.condition,
        riskLevel: p.riskLevel,
        roomOrLocation: p.roomOrLocation,
        status: p.status,
        medicalHistory: p.medicalHistory,
      },
      create: p,
    });
  }

  console.log(`✅ Seeded ${patientsData.length} initial clinical patient records.`);
  console.log('🎉 Seed complete.');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
