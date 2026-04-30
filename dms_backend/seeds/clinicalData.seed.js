import mongoose from 'mongoose';
import { getTenantConnection } from '../config/tenantDb.js';
import ClinicalFinding from '../models/ClinicalFinding.model.js';
import Diagnosis from '../models/Diagnosis.model.js';
import SuggestedTreatment from '../models/SuggestedTreatment.model.js';

const SAMPLE_CLINICAL_FINDINGS = [
  { name: 'Plaque Accumulation', category: 'Soft Tissue', description: 'Buildup of bacterial plaque on tooth surface' },
  { name: 'Calculus', category: 'Soft Tissue', description: 'Hardened plaque deposits (tartar)' },
  { name: 'Gingival Inflammation', category: 'Soft Tissue', description: 'Inflammation of the gums' },
  { name: 'Gingival Bleeding', category: 'Soft Tissue', description: 'Bleeding gums during probing' },
  { name: 'Periodontal Pocket', category: 'Periodontal', description: 'Deepened periodontal pocket depth' },
  { name: 'Tooth Mobility', category: 'Periodontal', description: 'Abnormal tooth movement' },
  { name: 'Enamel Decay', category: 'Hard Tissue', description: 'Carious lesion on enamel' },
  { name: 'Dentinal Caries', category: 'Hard Tissue', description: 'Caries extending into dentin' },
  { name: 'Tooth Fracture', category: 'Hard Tissue', description: 'Broken or fractured tooth structure' },
  { name: 'Discoloration', category: 'Hard Tissue', description: 'Staining or discoloration of tooth' },
  { name: 'Abfraction', category: 'Hard Tissue', description: 'Cervical lesion from occlusal force' },
  { name: 'Erosion', category: 'Hard Tissue', description: 'Tooth wear from acidic substances' },
  { name: 'Sensitivity', category: 'Hard Tissue', description: 'Dentinal hypersensitivity' },
  { name: 'Malocclusion', category: 'Periodontal', description: 'Improper bite alignment' },
  { name: 'Bruxism Evidence', category: 'Hard Tissue', description: 'Signs of tooth grinding' }
];

const SAMPLE_DIAGNOSES = [
  { name: 'Gingivitis', code: 'K05.0', category: 'Periodontal', description: 'Inflammation of gingival tissues' },
  { name: 'Chronic Periodontitis', code: 'K05.1', category: 'Periodontal', description: 'Long-standing inflammatory disease of periodontal tissues' },
  { name: 'Dental Caries - Coronal', code: 'K02.1', category: 'Caries', description: 'Decay on coronal surface of tooth' },
  { name: 'Dental Caries - Radicular', code: 'K02.7', category: 'Caries', description: 'Decay on root surface of tooth' },
  { name: 'Reversible Pulpitis', code: 'K04.00', category: 'Endodontic', description: 'Inflammation of pulp with potential for recovery' },
  { name: 'Irreversible Pulpitis', code: 'K04.02', category: 'Endodontic', description: 'Severe inflammation of pulp requiring RCT' },
  { name: 'Pulp Necrosis', code: 'K04.1', category: 'Endodontic', description: 'Death of pulp tissue' },
  { name: 'Periapical Abscess', code: 'K04.7', category: 'Endodontic', description: 'Pus collection around root apex' },
  { name: 'Tooth Fracture', code: 'S02.5', category: 'Trauma', description: 'Fractured tooth structure' },
  { name: 'Dental Erosion', code: 'K03.2', category: 'Wear', description: 'Loss of tooth structure due to acids' },
  { name: 'Abrasion', code: 'K03.1', category: 'Wear', description: 'Loss of tooth structure due to friction' },
  { name: 'Dentinal Hypersensitivity', code: 'K03.8', category: 'Sensitivity', description: 'Tooth sensitivity to external stimuli' },
  { name: 'Malocclusion', code: 'M26.3', category: 'Orthodontic', description: 'Improper bite relationship' }
];

const SAMPLE_SUGGESTED_TREATMENTS = [
  { name: 'Professional Cleaning (Scaling)', cost: 500, category: 'Preventive', description: 'Removal of plaque and calculus' },
  { name: 'Root Planning', cost: 1000, category: 'Preventive', description: 'Smoothing of root surfaces' },
  { name: 'Polishing', cost: 200, category: 'Preventive', description: 'Polish and stain removal' },
  { name: 'Fluoride Treatment', cost: 300, category: 'Preventive', description: 'Topical fluoride application' },
  { name: 'Composite Resin Filling', cost: 1500, category: 'Restorative', description: 'Tooth-colored filling material' },
  { name: 'Amalgam Filling', cost: 800, category: 'Restorative', description: 'Silver amalgam filling' },
  { name: 'Glass Ionomer Filling', cost: 600, category: 'Restorative', description: 'Glass ionomer cement filling' },
  { name: 'Root Canal Treatment (RCT)', cost: 5000, category: 'Endodontic', description: 'Complete endodontic therapy' },
  { name: 'RCT - Single Canal', cost: 3000, category: 'Endodontic', description: 'Root canal therapy single canal' },
  { name: 'RCT - Multiple Canals', cost: 4500, category: 'Endodontic', description: 'Root canal therapy multiple canals' },
  { name: 'Gum Grafting', cost: 8000, category: 'Surgical', description: 'Grafting procedure for gum recession' },
  { name: 'Extraction', cost: 1200, category: 'Surgical', description: 'Tooth extraction procedure' },
  { name: 'Surgical Extraction', cost: 2500, category: 'Surgical', description: 'Surgical removal of tooth' },
  { name: 'Crown - Ceramic', cost: 10000, category: 'Prosthodontic', description: 'All-ceramic crown' },
  { name: 'Crown - Porcelain Fused Metal', cost: 8000, category: 'Prosthodontic', description: 'PFM crown' },
  { name: 'Crown - Gold', cost: 12000, category: 'Prosthodontic', description: 'Gold crown' },
  { name: 'Bridge - 3 Unit', cost: 20000, category: 'Prosthodontic', description: '3-unit fixed bridge' },
  { name: 'Denture - Complete', cost: 15000, category: 'Prosthodontic', description: 'Complete denture' },
  { name: 'Denture - Partial', cost: 10000, category: 'Prosthodontic', description: 'Partial denture' },
  { name: 'Teeth Whitening', cost: 5000, category: 'Cosmetic', description: 'Professional teeth bleaching' },
  { name: 'Veneer - Composite', cost: 3000, category: 'Cosmetic', description: 'Composite veneer' },
  { name: 'Veneer - Ceramic', cost: 8000, category: 'Cosmetic', description: 'Ceramic veneer' }
];

export async function seedClinicalData(mongoUri, dbName) {
  try {
    const conn = await getTenantConnection(mongoUri, dbName);

    const ClinicalFindingModel = conn.model('ClinicalFinding', new mongoose.Schema({
      name: { type: String, required: true, unique: true },
      category: String,
      description: String,
      is_active: { type: Boolean, default: true }
    }));

    const DiagnosisModel = conn.model('Diagnosis', new mongoose.Schema({
      name: { type: String, required: true, unique: true },
      code: String,
      category: String,
      description: String,
      is_active: { type: Boolean, default: true }
    }));

    const SuggestedTreatmentModel = conn.model('SuggestedTreatment', new mongoose.Schema({
      name: { type: String, required: true, unique: true },
      category: String,
      cost: { type: Number, required: true },
      description: String,
      is_active: { type: Boolean, default: true }
    }));

    // Clear existing data
    await ClinicalFindingModel.deleteMany({});
    await DiagnosisModel.deleteMany({});
    await SuggestedTreatmentModel.deleteMany({});

    // Insert sample data
    await ClinicalFindingModel.insertMany(
      SAMPLE_CLINICAL_FINDINGS.map(item => ({ ...item, is_active: true }))
    );
    console.log(`✅ Seeded ${SAMPLE_CLINICAL_FINDINGS.length} clinical findings`);

    await DiagnosisModel.insertMany(
      SAMPLE_DIAGNOSES.map(item => ({ ...item, is_active: true }))
    );
    console.log(`✅ Seeded ${SAMPLE_DIAGNOSES.length} diagnoses`);

    await SuggestedTreatmentModel.insertMany(
      SAMPLE_SUGGESTED_TREATMENTS.map(item => ({ ...item, is_active: true }))
    );
    console.log(`✅ Seeded ${SAMPLE_SUGGESTED_TREATMENTS.length} suggested treatments`);

  } catch (err) {
    console.error('❌ Seeding failed:', err.message);
    throw err;
  }
}
