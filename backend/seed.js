const mongoose = require('mongoose');
const Patient = require('./models/Patient');
const Report = require('./models/Report');
const User = require('./models/User');

const MONGO_URI = "mongodb+srv://tanmay261006_1:tanmay123@cluster1.9bpvqzm.mongodb.net/zenthera?appName=Cluster1";

const FIRST_NAMES = ["James", "Mary", "Robert", "Patricia", "John", "Jennifer", "Michael", "Linda", "David", "Elizabeth", "William", "Barbara", "Richard", "Susan", "Joseph", "Jessica", "Thomas", "Sarah", "Charles", "Karen", "Christopher", "Lisa", "Daniel", "Nancy", "Matthew", "Betty", "Anthony", "Margaret", "Mark", "Sandra"];
const LAST_NAMES = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson", "Thomas", "Taylor", "Moore", "Jackson", "Martin", "Lee", "Perez", "Thompson", "White", "Harris", "Sanchez", "Clark", "Ramirez", "Lewis", "Robinson"];

const DIAGNOSES = ["UTI", "Pneumonia", "Sepsis", "Wound Infection", "Bacteremia", "Meningitis", "Endocarditis", "Osteomyelitis", "Cellulitis", "Pyelonephritis"];
const ORGANISMS = ["Escherichia coli", "Staphylococcus aureus", "Klebsiella pneumoniae", "Pseudomonas aeruginosa", "Acinetobacter baumannii", "Enterococcus faecalis", "Streptococcus pneumoniae", "Proteus mirabilis"];
const ANTIBIOTICS = ["Ciprofloxacin", "Meropenem", "Amoxicillin", "Vancomycin", "Ceftriaxone", "Azithromycin", "Gentamicin", "Levofloxacin", "Piperacillin-Tazobactam", "Linezolid", "Colistin", "Cefepime", "Doxycycline", "Erythromycin", "Ampicillin"];

function randomChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomNumber(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function seedDatabase() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB.');

    console.log('Wiping old data...');
    await Patient.deleteMany({});
    await Report.deleteMany({});

    // Get an admin/doctor user to assign to
    let user = await User.findOne({});
    if (!user) {
      console.log('No user found in DB. Creating a dummy user for data attribution.');
      user = await User.create({ name: 'System Admin', email: 'admin@zenthera.com', password: 'password', role: 'admin' });
    }

    const patientsToCreate = 350;
    const patients = [];
    const reports = [];

    console.log(`Generating ${patientsToCreate} patients...`);
    
    // Distribute creation dates over the last 6 months
    const now = new Date();
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(now.getMonth() - 6);

    for (let i = 0; i < patientsToCreate; i++) {
      const createdAt = new Date(sixMonthsAgo.getTime() + Math.random() * (now.getTime() - sixMonthsAgo.getTime()));
      
      const patient = {
        name: `${randomChoice(FIRST_NAMES)} ${randomChoice(LAST_NAMES)}`,
        age: randomNumber(18, 85),
        gender: randomChoice(["Male", "Female"]),
        contact: `+1 ${randomNumber(200, 999)}-${randomNumber(200, 999)}-${randomNumber(1000, 9999)}`,
        diagnosis: randomChoice(DIAGNOSES),
        ward: randomChoice(["General", "ICU", "Pediatric", "Oncology"]),
        status: randomChoice(["Active", "Active", "Discharged", "Critical"]),
        addedBy: user._id,
        createdAt: createdAt,
        updatedAt: createdAt
      };
      patients.push(patient);
    }

    const insertedPatients = await Patient.insertMany(patients);
    console.log(`Inserted ${insertedPatients.length} patients.`);

    console.log('Generating reports for patients...');
    for (const patient of insertedPatients) {
      // 80% chance of having 1 report, 20% chance of having 2 reports
      const numReports = Math.random() < 0.8 ? 1 : 2;
      
      for (let r = 0; r < numReports; r++) {
        // Report date should be after patient creation date
        const reportDate = new Date(patient.createdAt.getTime() + Math.random() * (now.getTime() - patient.createdAt.getTime()));
        
        const numPredictions = randomNumber(4, 10);
        const predictions = [];
        let totalResistant = 0;
        let totalSusceptible = 0;

        // Ensure unique antibiotics per report
        const shuffledAntibiotics = [...ANTIBIOTICS].sort(() => 0.5 - Math.random());
        
        for (let p = 0; p < numPredictions; p++) {
          const phenotype = Math.random() < 0.35 ? "Resistant" : "Susceptible"; // 35% chance of resistance
          if (phenotype === "Resistant") totalResistant++;
          else totalSusceptible++;

          predictions.push({
            antibiotic: shuffledAntibiotics[p],
            phenotype: phenotype,
            confidence: (Math.random() * 0.4 + 0.6).toFixed(4), // 0.60 to 0.99
            model: randomChoice(["XGBoost", "RandomForest", "LogisticRegression"]),
            confidence_tier: randomChoice(["High", "High", "Medium"])
          });
        }

        const organism = randomChoice(ORGANISMS);
        
        // Pick a recommended drug that is Susceptible
        const susceptiblePreds = predictions.filter(p => p.phenotype === 'Susceptible');
        const recommendedDrug = susceptiblePreds.length > 0 ? randomChoice(susceptiblePreds).antibiotic : "None (All Resistant)";

        reports.push({
          patient: patient._id,
          fileName: `isolate_${randomNumber(10000, 99999)}.fasta`,
          organism: organism,
          seqLength: randomNumber(3000000, 5500000),
          gcContent: (Math.random() * 20 + 40).toFixed(2), // 40-60%
          predictions: predictions,
          totalResistant: totalResistant,
          totalSusceptible: totalSusceptible,
          recommendedDrug: recommendedDrug,
          analyzedBy: user._id,
          createdAt: reportDate,
          updatedAt: reportDate
        });
      }
    }

    const insertedReports = await Report.insertMany(reports);
    console.log(`Inserted ${insertedReports.length} reports.`);

    console.log('Seed completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
}

seedDatabase();
