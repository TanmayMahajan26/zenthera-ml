const mongoose = require('mongoose');
const { faker } = require('@faker-js/faker');
const Patient = require('./models/Patient');
const Report = require('./models/Report');

const MONGO_URI = "mongodb+srv://tanmay261006_1:tanmay123@cluster1.9bpvqzm.mongodb.net/zenthera?appName=Cluster1";

const ORGANISMS = [
  'Staphylococcus aureus', 'Escherichia coli', 'Klebsiella pneumoniae', 
  'Pseudomonas aeruginosa', 'Streptococcus pneumoniae', 'Acinetobacter baumannii',
  'Enterococcus faecalis', 'Enterobacter cloacae'
];

const ANTIBIOTICS = [
  'Amoxicillin', 'Ampicillin', 'Azithromycin', 'Cefixime', 'Ciprofloxacin', 
  'Clindamycin', 'Erythromycin', 'Gentamicin', 'Levofloxacin', 'Meropenem', 
  'Ofloxacin', 'Penicillin', 'Tetracycline', 'Vancomycin'
];

const WARDS = ['ICU', 'General', 'Emergency', 'Pediatrics', 'Oncology', 'Surgery', 'Outpatient'];

async function seedDatabase() {
  try {
    console.log('Connecting to MongoDB Atlas...');
    await mongoose.connect(MONGO_URI);
    console.log('Connected!');

    // Optional: Clear existing patients and reports
    console.log('Clearing old patient data...');
    await Patient.deleteMany({});
    await Report.deleteMany({});
    console.log('Old data cleared.');

    const NUM_PATIENTS = 350;
    const patientsToInsert = [];

    console.log(`Generating ${NUM_PATIENTS} realistic patients...`);
    
    for (let i = 0; i < NUM_PATIENTS; i++) {
      patientsToInsert.push({
        name: faker.person.fullName(),
        age: faker.number.int({ min: 1, max: 95 }),
        gender: faker.helpers.arrayElement(['Male', 'Female']),
        mrn: `MRN-${faker.string.alphanumeric({ length: 6, casing: 'upper' })}`,
        ward: faker.helpers.arrayElement(WARDS),
        diagnosis: faker.helpers.arrayElement([
          'Pneumonia', 'Sepsis', 'Urinary Tract Infection', 'Wound Infection', 
          'Bacteremia', 'Cellulitis', 'Endocarditis', 'Osteomyelitis'
        ]),
        status: faker.helpers.arrayElement(['Critical', 'Active', 'Discharged']),
        createdAt: faker.date.past({ years: 0.5 }) // past 6 months
      });
    }

    const insertedPatients = await Patient.insertMany(patientsToInsert);
    console.log(`Inserted ${insertedPatients.length} patients.`);

    console.log('Generating clinical reports for patients...');
    const reportsToInsert = [];

    // Give most patients 1 report, some 2 or 3
    for (const patient of insertedPatients) {
      const numReports = faker.number.int({ min: 1, max: 3 });
      
      for (let r = 0; r < numReports; r++) {
        // Randomly determine if this report has high resistance
        const isHighlyResistant = faker.datatype.boolean(0.3); // 30% chance
        const predictions = [];
        let resCount = 0;
        let susCount = 0;

        for (const ab of ANTIBIOTICS) {
          // Generate realistic phenotype probability
          let isResistant = false;
          if (isHighlyResistant) {
            isResistant = faker.datatype.boolean(0.7);
          } else {
            isResistant = faker.datatype.boolean(0.2);
          }
          
          if (isResistant) resCount++;
          else susCount++;

          predictions.push({
            antibiotic: ab,
            phenotype: isResistant ? 'Resistant' : 'Susceptible',
            confidence: faker.number.float({ min: 65, max: 99, fractionDigits: 1 }),
            model: 'XGBoost',
            confidence_tier: faker.helpers.arrayElement(['High', 'High', 'Medium', 'Low'])
          });
        }

        // Figure out recommended drug (pick a susceptible one)
        const susceptibleDrugs = predictions.filter(p => p.phenotype === 'Susceptible');
        const recommendedDrug = susceptibleDrugs.length > 0 
          ? faker.helpers.arrayElement(susceptibleDrugs).antibiotic 
          : 'Combination Therapy Required';

        reportsToInsert.push({
          patient: patient._id,
          fileName: `sample_${faker.string.alphanumeric(6)}.fasta`,
          organism: faker.helpers.arrayElement(ORGANISMS),
          seqLength: faker.number.int({ min: 2500000, max: 5500000 }), // 2.5 - 5.5 Mbps
          gcContent: faker.number.float({ min: 32, max: 68, fractionDigits: 2 }),
          predictions: predictions,
          totalResistant: resCount,
          totalSusceptible: susCount,
          recommendedDrug: recommendedDrug,
          createdAt: faker.date.between({ from: patient.createdAt, to: new Date() })
        });
      }
    }

    await Report.insertMany(reportsToInsert);
    console.log(`Inserted ${reportsToInsert.length} clinical reports.`);

    console.log('✅ Database seeding complete! Analytics graphs will now look amazing.');
    process.exit(0);

  } catch (err) {
    console.error('Error seeding database:', err);
    process.exit(1);
  }
}

seedDatabase();
