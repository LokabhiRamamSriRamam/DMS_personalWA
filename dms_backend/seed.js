import { MongoClient, ObjectId } from "mongodb";
import { faker } from '@faker-js/faker';
import 'dotenv/config';

// CONFIGURATION
const URI = process.env.MONGO_URI || "mongodb://localhost:27017";
const DB_NAME = "dental_clinic_db";

async function seedDatabase() {
  const client = new MongoClient(URI);

  try {
    await client.connect();
    console.log("✅ Connected to MongoDB");
    const db = client.db(DB_NAME);

    // ==========================================
    // 1. CLEAR EXISTING DATA
    // ==========================================
    const collections = [
      "patients", "appointments", "visits", "inventory", 
      "inventory_logs", "invoices", "transactions", 
      "vendors", "lab_orders", "lab_catalog_items"
    ];

    for (const col of collections) {
      await db.collection(col).deleteMany({});
    }
    console.log("🗑️  Cleared all 10 collections");

    // ==========================================
    // 2. CREATE VENDORS & LAB CATALOG
    // ==========================================
    const vendorIds = [new ObjectId(), new ObjectId(), new ObjectId()];
    const vendors = [
      { _id: vendorIds[0], name: "Dental Depot", type: "Consumable", contact_person: "Rajesh", phone: "9876543210", email: "orders@depot.com", address: "Mumbai" },
      { _id: vendorIds[1], name: "City Lab", type: "Lab", contact_person: "Mr. Verma", phone: "9988776655", email: "lab@city.com", address: "Delhi" },
      { _id: vendorIds[2], name: "MedPlus Pharma", type: "Pharmacy", contact_person: "Suresh", phone: "1122334455", email: "pharma@medplus.com", address: "Pune" }
    ];
    await db.collection("vendors").insertMany(vendors);

    const labCatalogItems = [
      { name: "Zirconia Crown", category: "Crown & Bridge", price: 4500, turnaround_time: "4 Days", preferred_vendor_id: vendorIds[1] },
      { name: "Clear Aligner", category: "Orthodontics", price: 25000, turnaround_time: "14 Days", preferred_vendor_id: vendorIds[1] },
      { name: "Complete Denture", category: "Prosthodontics", price: 15000, turnaround_time: "7 Days", preferred_vendor_id: vendorIds[1] }
    ];
    await db.collection("lab_catalog_items").insertMany(labCatalogItems);
    console.log(`🏭 Inserted Vendors & Lab Catalog`);

    // ==========================================
    // 3. CREATE INVENTORY (Pharmacy & Consumables)
    // ==========================================
    const inventoryItems = [];
    
    // 1. Pharmacy Item
    inventoryItems.push({
      _id: new ObjectId(),
      name: "Amoxicillin 500mg",
      type: "Pharmacy",
      category: "Antibiotic",
      stock_on_hand: 500,
      unit: "Capsule",
      purchase_rate: 5,
      selling_price: 10,
      min_stock_level: 100,
      batches: [{ batch_number: "B101", expiry_date: faker.date.future(), quantity: 500 }]
    });

    // 2. Consumable Item (Linked to Treatment)
    inventoryItems.push({
      _id: new ObjectId(),
      name: "Root Canal Kit",
      type: "Consumable",
      category: "Endodontics",
      stock_on_hand: 50,
      unit: "Kit",
      purchase_rate: 500,
      selling_price: 0, // Not sold directly
      min_stock_level: 10,
      batches: [{ batch_number: "RC-202", expiry_date: faker.date.future(), quantity: 50 }]
    });

    await db.collection("inventory").insertMany(inventoryItems);
    console.log(`📦 Inserted Inventory`);

    // ==========================================
    // 4. CREATE PATIENTS
    // ==========================================
    const patients = [];
    for (let i = 0; i < 20; i++) {
      patients.push({
        _id: new ObjectId(),
        patientId: `PID-2025-${String(i + 1).padStart(3, '0')}`,
        first_name: faker.person.firstName(),
        last_name: faker.person.lastName(),
        dob: faker.date.birthdate({ min: 18, max: 80, mode: 'age' }),
        gender: faker.person.sexType(),
        contact: {
          mobile: faker.phone.number('9#########'),
          email: faker.internet.email(),
          address: faker.location.streetAddress(),
          city: faker.location.city()
        },
        medical_history: faker.helpers.arrayElements(['Diabetes', 'Hypertension', 'Asthma'], faker.number.int({ min: 0, max: 2 })),
        total_due: 0,
        createdAt: faker.date.past()
      });
    }
    await db.collection("patients").insertMany(patients);
    console.log(`👥 Inserted ${patients.length} patients`);

    // ==========================================
    // 5. GENERATE CLINICAL HISTORY
    // ==========================================
    const appointments = [];
    const visits = [];
    const invoices = [];
    const transactions = [];
    const labOrders = [];
    const doctorIds = [new ObjectId(), new ObjectId()]; // Mock Doctors

    for (const patient of patients) {
      // Create 1-3 appointments per patient
      const numAppts = faker.number.int({ min: 1, max: 3 });

      for (let j = 0; j < numAppts; j++) {
        const apptDate = faker.date.recent({ days: 60 });
        const doctorId = faker.helpers.arrayElement(doctorIds);
        const apptId = new ObjectId();
        const visitId = new ObjectId();
        const invoiceId = new ObjectId();

        // -- A. Appointment --
        appointments.push({
          _id: apptId,
          patient_id: patient._id,
          doctor_id: doctorId,
          start_time: apptDate,
          end_time: new Date(apptDate.getTime() + 30 * 60000),
          title: "Consultation",
          status: "Completed",
          type: "Consultation",
          room_number: "Room 1"
        });

        // -- B. Visit (Medical Record) --
        visits.push({
          _id: visitId,
          patient_id: patient._id,
          appointment_id: apptId,
          doctor_id: doctorId,
          date: apptDate,
          findings: {
            diagnosis_notes: "Patient complains of sensitivity.",
            soft_tissue: ["Normal"],
            tmj: ["Normal"]
          },
          treatments: [{
            treatment_name: "Root Canal Treatment",
            teeth_numbers: ["26"],
            cost: 5000,
            status: "Completed",
            consumables_used: [{ inventory_item_id: inventoryItems[1]._id, quantity: 1 }]
          }],
          prescriptions: [{
            drug_name: "Amoxicillin 500mg",
            dosage: "1-0-1",
            duration: "5 Days",
            instructions: "After food"
          }]
        });

        // -- C. Invoice --
        const invoiceTotal = 5000;
        const paidAmount = faker.helpers.arrayElement([0, 2000, 5000]);
        const status = paidAmount === 5000 ? 'Paid' : paidAmount > 0 ? 'Partially Paid' : 'Pending';

        invoices.push({
          _id: invoiceId,
          invoice_number: `INV-${faker.string.alphanumeric(6).toUpperCase()}`,
          patient_id: patient._id,
          visit_id: visitId,
          date: apptDate,
          items: [{ description: "Root Canal Treatment", type: "Service", qty: 1, unit_price: 5000, total: 5000 }],
          sub_total: 5000,
          grand_total: 5000,
          paid_amount: paidAmount,
          pending_amount: 5000 - paidAmount,
          status: status
        });

        // -- D. Transaction (If paid) --
        if (paidAmount > 0) {
          transactions.push({
            type: "Income",
            category: "Treatment",
            amount: paidAmount,
            payment_method: "Cash",
            date: apptDate,
            party_name: `${patient.first_name} ${patient.last_name}`,
            invoice_id: invoiceId
          });
        }

        // -- E. Lab Order (Random chance) --
        if (faker.datatype.boolean()) {
          labOrders.push({
            patient_id: patient._id,
            vendor_id: vendorIds[1], // City Lab
            doctor_id: doctorId,
            order_date: apptDate,
            expected_delivery: new Date(apptDate.getTime() + 4 * 86400000), // +4 days
            items: [{ item_name: "Zirconia Crown", cost: 4500, instructions: "Shade A2" }],
            status: "In Process",
            cost_to_clinic: 4500
          });
        }
      }
    }

    // Insert Clinical Data
    if (appointments.length) await db.collection("appointments").insertMany(appointments);
    if (visits.length) await db.collection("visits").insertMany(visits);
    if (invoices.length) await db.collection("invoices").insertMany(invoices);
    if (transactions.length) await db.collection("transactions").insertMany(transactions);
    if (labOrders.length) await db.collection("lab_orders").insertMany(labOrders);

    console.log(`📅 Inserted ${appointments.length} appointments`);
    console.log(`💰 Inserted ${invoices.length} invoices & ${transactions.length} transactions`);
    console.log(`🧪 Inserted ${labOrders.length} lab orders`);

  } catch (err) {
    console.error("❌ Seeding Error:", err);
  } finally {
    await client.close();
    console.log("👋 Connection closed");
  }
}

seedDatabase();