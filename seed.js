require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('./src/models/User');
const Hospital = require('./src/models/Hospital');
const Patient = require('./src/models/Patient');
const Referral = require('./src/models/Referral');
const Clinic = require('./src/models/Clinic');

const PASSWORD = 'Test@1234';

// Connect to MongoDB
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('✅ MongoDB connected');
    } catch (error) {
        console.error('❌ MongoDB connection error:', error.message);
        process.exit(1);
    }
};

// Hash password
const hashPassword = async (password) => {
    const salt = await bcrypt.genSalt(12);
    return await bcrypt.hash(password, salt);
};

// Delete all existing data
const deleteAllData = async () => {
    console.log('🗑️  Deleting all existing data...');
    try {
        await User.deleteMany({});
        await Hospital.deleteMany({});
        await Patient.deleteMany({});
        await Referral.deleteMany({});
        await Clinic.deleteMany({});
        console.log('✅ All existing data deleted');
    } catch (error) {
        console.error('❌ Error deleting data:', error);
        throw error;
    }
};

// Create Super Admins
const createSuperAdmins = async () => {
    console.log('👤 Creating super admins...');
    const hashedPassword = await hashPassword(PASSWORD);
    const admins = [];

    const adminData = [
        { firstName: 'Admin', lastName: 'One', email: 'admin1@gmail.com', adminLevel: 'system', organization: 'Patient Referral System', responsibilities: 'System administration and platform management' },
        { firstName: 'Admin', lastName: 'Two', email: 'admin2@gmail.com', adminLevel: 'platform', organization: 'Patient Referral System', responsibilities: 'Platform operations and user management' },
        { firstName: 'Admin', lastName: 'Three', email: 'admin3@gmail.com', adminLevel: 'support', organization: 'Patient Referral System', responsibilities: 'Customer support and issue resolution' },
        { firstName: 'Admin', lastName: 'Four', email: 'admin4@gmail.com', adminLevel: 'system', organization: 'Patient Referral System', responsibilities: 'System maintenance and security' },
        { firstName: 'Admin', lastName: 'Five', email: 'admin5@gmail.com', adminLevel: 'platform', organization: 'Patient Referral System', responsibilities: 'Platform development and integration' },
    ];

    for (const data of adminData) {
        const admin = new User({
            ...data,
            password: hashedPassword,
            role: 'super_admin',
            phone: '+1234567890',
            approvalStatus: 'approved',
            isActive: true,
            isEmailVerified: true,
        });
        await admin.save();
        admins.push(admin);
    }

    console.log(`✅ Created ${admins.length} super admins`);
    return admins;
};

// Create Hospitals
const createHospitals = async (admins) => {
    console.log('🏥 Creating hospitals...');
    const hospitals = [];

    const hospitalData = [
        { name: 'City General Hospital', email: 'hospital1@gmail.com', phone: '+1234567891', type: 'public', specialties: ['Cardiology', 'Neurology', 'Emergency'], city: 'New York', state: 'NY', zipCode: '10001' },
        { name: 'Metro Medical Center', email: 'hospital2@gmail.com', phone: '+1234567892', type: 'private', specialties: ['Oncology', 'Surgery', 'Radiology'], city: 'Los Angeles', state: 'CA', zipCode: '90001' },
        { name: 'Community Health Hospital', email: 'hospital3@gmail.com', phone: '+1234567893', type: 'non-profit', specialties: ['Pediatrics', 'Family Medicine', 'Mental Health'], city: 'Chicago', state: 'IL', zipCode: '60601' },
        { name: 'Regional Medical Center', email: 'hospital4@gmail.com', phone: '+1234567894', type: 'government', specialties: ['Orthopedics', 'Trauma', 'Rehabilitation'], city: 'Houston', state: 'TX', zipCode: '77001' },
        { name: 'University Medical Hospital', email: 'hospital5@gmail.com', phone: '+1234567895', type: 'public', specialties: ['Research', 'Teaching', 'Specialized Care'], city: 'Boston', state: 'MA', zipCode: '02101' },
    ];

    for (const data of hospitalData) {
        const hospital = new Hospital({
            name: data.name,
            email: data.email,
            phone: data.phone,
            address: {
                street: `${Math.floor(Math.random() * 9999)} Main Street`,
                city: data.city,
                state: data.state,
                zipCode: data.zipCode,
                country: 'USA'
            },
            type: data.type,
            specialties: data.specialties,
            capacity: {
                beds: Math.floor(Math.random() * 500) + 100,
                icuBeds: Math.floor(Math.random() * 50) + 10,
                emergencyBeds: Math.floor(Math.random() * 30) + 5
            },
            services: ['Emergency Care', 'Surgery', 'Laboratory', 'Radiology', 'Pharmacy'],
            accreditation: {
                jcaho: Math.random() > 0.5,
                cap: Math.random() > 0.5,
                aoa: Math.random() > 0.5
            },
            website: `https://www.${data.name.toLowerCase().replace(/\s+/g, '')}.com`,
            description: `${data.name} is a leading healthcare facility providing comprehensive medical services.`,
            status: 'approved',
            isActive: true,
            approvedBy: admins[0]._id,
            approvedAt: new Date(),
        });
        await hospital.save();
        hospitals.push(hospital);
    }

    console.log(`✅ Created ${hospitals.length} hospitals`);
    return hospitals;
};

// Create Hospital Users
const createHospitalUsers = async (hospitals, admins) => {
    console.log('🏥 Creating hospital users...');
    const hashedPassword = await hashPassword(PASSWORD);
    const hospitalUsers = [];

    for (let i = 0; i < hospitals.length; i++) {
        const hospital = hospitals[i];
        const user = new User({
            firstName: 'Hospital',
            lastName: `Admin ${i + 1}`,
            email: hospital.email,
            password: hashedPassword,
            role: 'hospital',
            phone: hospital.phone,
            address: hospital.address,
            hospitalId: hospital._id, // Link hospital user to hospital
            approvalStatus: 'approved',
            isActive: true,
            isEmailVerified: true,
            approvedBy: admins[0]._id,
            approvedAt: new Date(),
        });
        await user.save();
        hospitalUsers.push({ user, hospital });
    }

    console.log(`✅ Created ${hospitalUsers.length} hospital users`);
    return hospitalUsers;
};

// Create Doctors (Hospital Doctors)
const createDoctors = async (hospitals, admins) => {
    console.log('👨‍⚕️ Creating hospital doctors...');
    const hashedPassword = await hashPassword(PASSWORD);
    const doctors = [];

    const specializations = ['Cardiology', 'Neurology', 'Orthopedics', 'Pediatrics', 'Surgery', 'Oncology', 'Emergency Medicine', 'Radiology'];
    const qualifications = ['MD', 'DO', 'MBBS', 'MD PhD'];

    for (let i = 0; i < 5; i++) {
        const hospital = hospitals[i % hospitals.length];
        const specialization = specializations[i % specializations.length];

        const doctor = new User({
            firstName: 'Doctor',
            lastName: `${i + 1}`,
            email: `doctor${i + 1}@gmail.com`,
            password: hashedPassword,
            role: 'doctor',
            phone: `+1234567${900 + i}`,
            dateOfBirth: new Date(1980 + (i % 20), 0, 1),
            gender: i % 2 === 0 ? 'male' : 'female',
            address: {
                street: `${Math.floor(Math.random() * 9999)} Doctor Street`,
                city: hospital.address.city,
                state: hospital.address.state,
                zipCode: hospital.address.zipCode,
                country: 'USA'
            },
            practiceType: 'hospital',
            hospitalId: hospital._id,
            licenseNumber: `LIC-${1000 + i}`,
            specialization: specialization,
            yearsOfExperience: 5 + i,
            qualification: qualifications[i % qualifications.length],
            approvalStatus: 'approved',
            isActive: true,
            isEmailVerified: true,
            approvedBy: admins[0]._id,
            approvedAt: new Date(),
        });
        await doctor.save();
        doctors.push(doctor);
    }

    console.log(`✅ Created ${doctors.length} hospital doctors`);
    return doctors;
};

// Create Clinic Doctors
const createClinicDoctors = async (admins) => {
    console.log('👨‍⚕️ Creating clinic doctors...');
    const hashedPassword = await hashPassword(PASSWORD);
    const clinicDoctors = [];

    const specializations = ['Family Medicine', 'Dermatology', 'Internal Medicine', 'Psychiatry', 'Ophthalmology'];
    const qualifications = ['MD', 'DO', 'MBBS'];

    for (let i = 0; i < 5; i++) {
        const specialization = specializations[i % specializations.length];
        const address = {
            street: `${Math.floor(Math.random() * 9999)} Clinic Avenue`,
            city: ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Boston'][i],
            state: ['NY', 'CA', 'IL', 'TX', 'MA'][i],
            zipCode: `${10000 + i}`,
            country: 'USA'
        };

        // Create doctor first (without clinicId)
        const doctor = new User({
            firstName: 'Clinic',
            lastName: `Doctor ${i + 1}`,
            email: `clicnicDoc${i + 1}@gmail.com`,
            password: hashedPassword,
            role: 'doctor',
            phone: `+1234567${700 + i}`,
            dateOfBirth: new Date(1975 + (i % 15), 0, 1),
            gender: i % 2 === 0 ? 'male' : 'female',
            address: address,
            practiceType: 'own_clinic',
            licenseNumber: `CLINIC-LIC-${2000 + i}`,
            specialization: specialization,
            yearsOfExperience: 10 + i,
            qualification: qualifications[i % qualifications.length],
            approvalStatus: 'approved',
            isActive: true,
            isEmailVerified: true,
            approvedBy: admins[0]._id,
            approvedAt: new Date(),
        });
        await doctor.save();

        // Create clinic with ownerId
        const clinic = new Clinic({
            name: `Clinic ${i + 1} Medical Center`,
            address: address,
            phone: `+1234567${800 + i}`,
            email: `clinic${i + 1}@gmail.com`,
            website: `https://www.clinic${i + 1}medical.com`,
            description: `Clinic ${i + 1} Medical Center provides comprehensive primary care services.`,
            ownerId: doctor._id,
            isActive: true,
        });
        await clinic.save();

        // Update doctor with clinicId
        doctor.clinicId = clinic._id;
        await doctor.save();

        clinicDoctors.push({ doctor, clinic });
    }

    console.log(`✅ Created ${clinicDoctors.length} clinic doctors`);
    return clinicDoctors;
};

// Create Patients
const createPatients = async (hospitals, doctors, admins) => {
    console.log('👤 Creating patients...');
    const hashedPassword = await hashPassword(PASSWORD);
    const patients = [];

    const bloodTypes = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
    const genders = ['male', 'female', 'other'];

    for (let i = 0; i < 5; i++) {
        const hospital = hospitals[i % hospitals.length];
        const doctor = doctors[i % doctors.length];
        const gender = genders[i % genders.length];

        const patient = new User({
            firstName: 'Patient',
            lastName: `${i + 1}`,
            email: `patient${i + 1}@gmail.com`,
            password: hashedPassword,
            role: 'patient',
            phone: `+1234567${600 + i}`,
            dateOfBirth: new Date(1990 + (i % 30), i % 12, (i % 28) + 1),
            gender: gender,
            address: {
                street: `${Math.floor(Math.random() * 9999)} Patient Street`,
                city: hospital.address.city,
                state: hospital.address.state,
                zipCode: hospital.address.zipCode,
                country: 'USA'
            },
            emergencyContact: `Emergency Contact ${i + 1}`,
            emergencyPhone: `+1234567${500 + i}`,
            medicalHistory: `Patient ${i + 1} has a history of regular checkups.`,
            approvalStatus: 'approved',
            isActive: true,
            isEmailVerified: true,
            approvedBy: admins[0]._id,
            approvedAt: new Date(),
        });
        await patient.save();

        // Create Patient record
        const patientId = Patient.generatePatientId();
        const patientRecord = new Patient({
            patientId: patientId,
            firstName: patient.firstName,
            lastName: patient.lastName,
            dateOfBirth: patient.dateOfBirth,
            gender: patient.gender,
            phone: patient.phone,
            email: patient.email,
            address: patient.address,
            emergencyContact: {
                name: patient.emergencyContact,
                relationship: ['Spouse', 'Parent', 'Sibling', 'Friend', 'Other'][i % 5],
                phone: patient.emergencyPhone,
                email: `emergency${i + 1}@gmail.com`
            },
            bloodType: bloodTypes[i % bloodTypes.length],
            currentHospital: hospital._id,
            assignedDoctor: doctor._id,
            status: 'active',
            preferredLanguage: 'English',
        });
        await patientRecord.save();

        patients.push({ user: patient, record: patientRecord });
    }

    console.log(`✅ Created ${patients.length} patients`);
    return patients;
};

// Create Referrals
const createReferrals = async (patients, doctors, hospitalUsers) => {
    console.log('📋 Creating referrals...');
    const referrals = [];

    const priorities = ['low', 'medium', 'high', 'urgent'];
    const statuses = ['pending', 'accepted', 'completed'];
    const specialties = ['Cardiology', 'Neurology', 'Orthopedics', 'Pediatrics', 'Surgery'];
    const reasons = [
        'Patient requires specialized cardiac evaluation',
        'Neurological consultation needed',
        'Orthopedic surgery referral',
        'Pediatric specialist consultation',
        'Surgical intervention required'
    ];

    for (let i = 0; i < 5; i++) {
        const patient = patients[i % patients.length];
        const referringDoctor = doctors[i % doctors.length];
        const referringHospitalData = hospitalUsers[i % hospitalUsers.length];
        const receivingHospitalData = hospitalUsers[(i + 1) % hospitalUsers.length];
        const receivingDoctor = doctors[(i + 1) % doctors.length];

        const referral = new Referral({
            referralId: Referral.generateReferralId(),
            patient: patient.user._id,
            referringDoctor: referringDoctor._id,
            referringHospital: referringHospitalData.hospital._id,
            receivingHospital: receivingHospitalData.hospital._id,
            receivingDoctor: receivingDoctor._id,
            reason: reasons[i % reasons.length],
            priority: priorities[i % priorities.length],
            specialty: specialties[i % specialties.length],
            chiefComplaint: `Patient presents with ${['chest pain', 'headache', 'joint pain', 'fever', 'abdominal pain'][i % 5]}`,
            historyOfPresentIllness: `The patient has been experiencing symptoms for the past ${i + 1} weeks.`,
            physicalExamination: `General examination reveals ${['normal vitals', 'elevated blood pressure', 'tachycardia', 'fever', 'abnormal findings'][i % 5]}.`,
            vitalSigns: {
                bloodPressure: `${120 + i * 5}/${80 + i * 2}`,
                heartRate: 70 + i * 5,
                temperature: 98.6 + (i * 0.2),
                respiratoryRate: 16 + i,
                oxygenSaturation: 98 - i,
                weight: 70 + i * 5,
                height: 170 + i * 2
            },
            diagnosis: {
                primary: `Primary Diagnosis ${i + 1}`,
                secondary: [`Secondary Diagnosis ${i + 1}A`, `Secondary Diagnosis ${i + 1}B`]
            },
            treatmentGiven: `Initial treatment provided: ${['medication', 'observation', 'symptomatic care', 'stabilization', 'monitoring'][i % 5]}.`,
            medications: [
                {
                    name: `Medication ${i + 1}`,
                    dosage: `${i + 1}00mg`,
                    frequency: 'twice daily',
                    duration: `${i + 1} weeks`
                }
            ],
            investigations: [], // Can be added through UI if needed
            status: statuses[i % statuses.length],
            response: i > 2 ? {
                notes: `Referral ${i + 1} has been reviewed and accepted.`,
                responseDate: new Date(),
                responseBy: receivingDoctor._id
            } : undefined,
            appointment: i > 1 ? {
                scheduledDate: new Date(Date.now() + (i + 1) * 24 * 60 * 60 * 1000),
                scheduledTime: `${9 + i}:00 AM`,
                location: `Room ${100 + i}`,
                notes: `Please arrive 15 minutes early.`
            } : undefined,
            followUp: {
                required: i % 2 === 0,
                date: i % 2 === 0 ? new Date(Date.now() + (i + 2) * 7 * 24 * 60 * 60 * 1000) : undefined,
                notes: i % 2 === 0 ? `Follow-up appointment scheduled.` : undefined
            },
            timeline: [
                {
                    action: 'created',
                    timestamp: new Date(),
                    performedBy: referringDoctor._id,
                    notes: 'Referral created'
                }
            ]
        });

        if (referral.status === 'accepted' || referral.status === 'completed') {
            referral.timeline.push({
                action: 'accepted',
                timestamp: new Date(),
                performedBy: receivingDoctor._id,
                notes: 'Referral accepted'
            });
        }

        await referral.save();
        referrals.push(referral);
    }

    console.log(`✅ Created ${referrals.length} referrals`);
    return referrals;
};

// Main seed function
const seed = async () => {
    try {
        await connectDB();

        // Delete all existing data
        await deleteAllData();

        // Create data in order
        const admins = await createSuperAdmins();
        const hospitals = await createHospitals(admins);
        const hospitalUsers = await createHospitalUsers(hospitals, admins);
        const doctors = await createDoctors(hospitals, admins);
        const clinicDoctors = await createClinicDoctors(admins);
        const patients = await createPatients(hospitals, doctors, admins);
        const referrals = await createReferrals(patients, doctors, hospitalUsers);

        console.log('\n✅ Seed completed successfully!');
        console.log(`\n📊 Summary:`);
        console.log(`   - Super Admins: ${admins.length}`);
        console.log(`   - Hospitals: ${hospitals.length}`);
        console.log(`   - Hospital Users: ${hospitalUsers.length}`);
        console.log(`   - Hospital Doctors: ${doctors.length}`);
        console.log(`   - Clinic Doctors: ${clinicDoctors.length}`);
        console.log(`   - Patients: ${patients.length}`);
        console.log(`   - Referrals: ${referrals.length}`);
        console.log(`\n🔑 Password for all users: ${PASSWORD}`);

        process.exit(0);
    } catch (error) {
        console.error('❌ Seed error:', error);
        process.exit(1);
    }
};

// Run seed
seed();

