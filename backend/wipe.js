const mongoose = require('mongoose');
const Patient = require('./models/Patient');
const Report = require('./models/Report');

const MONGO_URI = "mongodb+srv://tanmay261006_1:tanmay123@cluster1.9bpvqzm.mongodb.net/zenthera?appName=Cluster1";

async function wipeDatabase() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected. Wiping Patients and Reports...');
    await Patient.deleteMany({});
    await Report.deleteMany({});
    console.log('Wipe complete.');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

wipeDatabase();
