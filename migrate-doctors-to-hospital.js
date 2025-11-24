const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./src/models/User');

// Connect to MongoDB
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/medinet', {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('✅ MongoDB Connected');
    } catch (error) {
        console.error('❌ MongoDB connection error:', error);
        process.exit(1);
    }
};

// Migration script to update existing doctors
const migrateDoctors = async () => {
    try {
        await connectDB();

        // Find all doctors without practiceType
        const doctors = await User.find({
            role: 'doctor',
            $or: [
                { practiceType: { $exists: false } },
                { practiceType: null }
            ]
        });

        console.log(`Found ${doctors.length} doctors to migrate`);

        let updated = 0;
        let skipped = 0;

        for (const doctor of doctors) {
            // If doctor has hospitalId, set practiceType to 'hospital'
            // Otherwise, we'll default to 'hospital' but they'll need to update their profile
            if (doctor.hospitalId) {
                doctor.practiceType = 'hospital';
                await doctor.save();
                updated++;
                console.log(`✅ Updated doctor ${doctor.email} - set practiceType to 'hospital'`);
            } else {
                // If no hospitalId, default to 'hospital' but they'll need to update
                // This handles edge cases where hospitalId might be missing
                doctor.practiceType = 'hospital';
                await doctor.save();
                updated++;
                console.log(`⚠️  Updated doctor ${doctor.email} - set practiceType to 'hospital' (no hospitalId found)`);
            }
        }

        console.log(`\n✅ Migration complete!`);
        console.log(`   - Updated: ${updated} doctors`);
        console.log(`   - Skipped: ${skipped} doctors`);

        process.exit(0);
    } catch (error) {
        console.error('❌ Migration error:', error);
        process.exit(1);
    }
};

// Run migration
migrateDoctors();


