import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
import mongoose from 'mongoose';
import { getTenantConnection } from '../config/tenantDb.js';
import { getTenantModels } from '../config/tenantModels.js';

dotenv.config({ path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../.env') });

(async () => {
  try {
    // Connect to analytics DB to fetch tenant info
    const analyticsConn = await mongoose.createConnection(process.env.ANALYTICS_MONGO_URI, {
      dbName: process.env.ANALYTICS_MONGO_DB_NAME || 'dms'
    }).asPromise();

    const tenantDoc = await analyticsConn.collection('tenants').findOne({});
    if (!tenantDoc) {
      console.error('❌ No tenant found in analytics database. Please create a tenant first.');
      process.exit(1);
    }

    // Connect to tenant database
    const tenantConn = await getTenantConnection(tenantDoc.mongoUri, tenantDoc.mongoDbName);
    const { Service, LabCatalogItem } = getTenantModels(tenantConn);

    // ── Services ──────────────────────────────────────────────────────────────────
    const services = [
      { name: 'Consultation',               category: 'General',         cost: 300,   isActive: true },
      { name: 'Follow-Up Consultation',     category: 'General',         cost: 150,   isActive: true },
      { name: 'Scaling & Polishing',        category: 'Preventive',      cost: 800,   isActive: true },
      { name: 'Fluoride Treatment',         category: 'Preventive',      cost: 500,   isActive: true },
      { name: 'Pit & Fissure Sealant',      category: 'Preventive',      cost: 400,   isActive: true },
      { name: 'Tooth Extraction (Simple)', category: 'Oral Surgery',     cost: 600,   isActive: true },
      { name: 'Surgical Extraction',        category: 'Oral Surgery',     cost: 1500,  isActive: true },
      { name: 'Root Canal Treatment (RCT)', category: 'Endodontics',     cost: 3500,  isActive: true },
      { name: 'Re-RCT',                     category: 'Endodontics',     cost: 4000,  isActive: true },
      { name: 'Post & Core',                category: 'Endodontics',     cost: 1200,  isActive: true },
      { name: 'Composite Filling',          category: 'Restorative',     cost: 700,   isActive: true },
      { name: 'GIC Filling',                category: 'Restorative',     cost: 400,   isActive: true },
      { name: 'Amalgam Filling',            category: 'Restorative',     cost: 500,   isActive: true },
      { name: 'Temporary Filling',          category: 'Restorative',     cost: 200,   isActive: true },
      { name: 'PFM Crown',                  category: 'Prosthodontics',  cost: 3500,  isActive: true },
      { name: 'Zirconia Crown',             category: 'Prosthodontics',  cost: 7000,  isActive: true },
      { name: 'Full Ceramic Crown',         category: 'Prosthodontics',  cost: 8000,  isActive: true },
      { name: 'Metal Crown',                category: 'Prosthodontics',  cost: 2000,  isActive: true },
      { name: 'Fixed Bridge (per unit)',    category: 'Prosthodontics',  cost: 4500,  isActive: true },
      { name: 'Complete Denture (pair)',    category: 'Prosthodontics',  cost: 18000, isActive: true },
      { name: 'Partial Denture',            category: 'Prosthodontics',  cost: 9000,  isActive: true },
      { name: 'Implant Placement',          category: 'Implantology',    cost: 25000, isActive: true },
      { name: 'Implant Crown',              category: 'Implantology',    cost: 8000,  isActive: true },
      { name: 'Braces (Metal)',             category: 'Orthodontics',    cost: 20000, isActive: true },
      { name: 'Braces (Ceramic)',           category: 'Orthodontics',    cost: 30000, isActive: true },
      { name: 'Clear Aligners',             category: 'Orthodontics',    cost: 45000, isActive: true },
      { name: 'Retainer',                   category: 'Orthodontics',    cost: 3000,  isActive: true },
      { name: 'Teeth Whitening (In-chair)', category: 'Cosmetic',        cost: 6000,  isActive: true },
      { name: 'Smile Designing',            category: 'Cosmetic',        cost: 15000, isActive: true },
      { name: 'Composite Veneer',           category: 'Cosmetic',        cost: 2500,  isActive: true },
      { name: 'Porcelain Veneer',           category: 'Cosmetic',        cost: 8000,  isActive: true },
      { name: 'X-Ray (IOPA)',               category: 'Radiology',       cost: 150,   isActive: true },
      { name: 'OPG',                        category: 'Radiology',       cost: 400,   isActive: true },
      { name: 'CBCT',                       category: 'Radiology',       cost: 2500,  isActive: true },
      { name: 'Gum Flap Surgery',           category: 'Periodontics',    cost: 5000,  isActive: true },
      { name: 'Bone Grafting',              category: 'Periodontics',    cost: 8000,  isActive: true },
      { name: 'Night Guard (Splint)',       category: 'General',         cost: 3500,  isActive: true },
      { name: 'Space Maintainer',           category: 'Paediatric',      cost: 2000,  isActive: true },
      { name: 'Pulpectomy',                 category: 'Paediatric',      cost: 1500,  isActive: true },
      { name: 'Stainless Steel Crown',      category: 'Paediatric',      cost: 1200,  isActive: true },
    ];

    // ── Lab Catalog Items ─────────────────────────────────────────────────────────
    const labItems = [
      { name: 'Zirconia Crown',              category: 'Crown & Bridge',   price: 4500,  turnaround_time: '4 Days' },
      { name: 'PFM Crown',                   category: 'Crown & Bridge',   price: 2000,  turnaround_time: '3 Days' },
      { name: 'Full Ceramic Crown',          category: 'Crown & Bridge',   price: 5000,  turnaround_time: '5 Days' },
      { name: 'Metal Crown',                 category: 'Crown & Bridge',   price: 1200,  turnaround_time: '3 Days' },
      { name: 'PFM Bridge (per unit)',       category: 'Crown & Bridge',   price: 2500,  turnaround_time: '5 Days' },
      { name: 'Zirconia Bridge (per unit)',  category: 'Crown & Bridge',   price: 5000,  turnaround_time: '6 Days' },
      { name: 'Complete Upper Denture',      category: 'Removable',        price: 6000,  turnaround_time: '7 Days' },
      { name: 'Complete Lower Denture',      category: 'Removable',        price: 6000,  turnaround_time: '7 Days' },
      { name: 'Complete Denture Set',        category: 'Removable',        price: 11000, turnaround_time: '7 Days' },
      { name: 'Partial Denture (Acrylic)',   category: 'Removable',        price: 4500,  turnaround_time: '5 Days' },
      { name: 'Partial Denture (Flexible)',  category: 'Removable',        price: 7000,  turnaround_time: '6 Days' },
      { name: 'Cast Partial Denture',        category: 'Removable',        price: 8500,  turnaround_time: '7 Days' },
      { name: 'Clear Aligner (per tray)',    category: 'Orthodontics',     price: 2500,  turnaround_time: '14 Days' },
      { name: 'Metal Retainer',              category: 'Orthodontics',     price: 1000,  turnaround_time: '3 Days' },
      { name: 'Hawley Retainer',             category: 'Orthodontics',     price: 1500,  turnaround_time: '4 Days' },
      { name: 'Essix Retainer',              category: 'Orthodontics',     price: 1800,  turnaround_time: '4 Days' },
      { name: 'Porcelain Veneer',            category: 'Cosmetic',         price: 4500,  turnaround_time: '5 Days' },
      { name: 'Composite Veneer (lab)',      category: 'Cosmetic',         price: 1500,  turnaround_time: '3 Days' },
      { name: 'Implant Abutment (custom)',   category: 'Implantology',     price: 6000,  turnaround_time: '5 Days' },
      { name: 'Night Guard',                 category: 'Appliances',       price: 2000,  turnaround_time: '3 Days' },
      { name: 'Occlusal Splint',             category: 'Appliances',       price: 2500,  turnaround_time: '3 Days' },
      { name: 'Space Maintainer (fixed)',    category: 'Paediatric',       price: 1200,  turnaround_time: '3 Days' },
      { name: 'Stainless Steel Crown (lab)', category: 'Paediatric',       price: 800,   turnaround_time: '2 Days' },
      { name: 'Post & Core (cast)',          category: 'Endodontics',      price: 1500,  turnaround_time: '3 Days' },
    ];

    // ── Insert (skip if already populated) ────────────────────────────────────────
    const existingServices = await Service.countDocuments();
    if (existingServices === 0) {
      await Service.insertMany(services);
      console.log(`✅ Inserted ${services.length} services`);
    } else {
      console.log(`⏭️  Services already seeded (${existingServices} found), skipping`);
    }

    const existingLabs = await LabCatalogItem.countDocuments();
    if (existingLabs === 0) {
      await LabCatalogItem.insertMany(labItems);
      console.log(`✅ Inserted ${labItems.length} lab catalog items`);
    } else {
      console.log(`⏭️  Lab catalog already seeded (${existingLabs} found), skipping`);
    }

    await tenantConn.close();
    await analyticsConn.close();
    console.log('✅ Done.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
})();
