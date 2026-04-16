import { Schema, model } from 'mongoose';

const LabCatalogItemSchema = new Schema({
  name: { 
    type: String, 
    required: true 
  }, // e.g. "Zirconia Crown"
  
  category: { 
    type: String, 
    default: 'Crown & Bridge' 
  }, // e.g. "Orthodontics", "Prosthodontics"
  
  price: { 
    type: Number, 
    required: true 
  }, // Standard Cost to Clinic
  
  turnaround_time: { 
    type: String 
  }, // e.g. "4 Days"
  
  preferred_vendor_id: { 
    type: Schema.Types.ObjectId, 
    ref: 'Vendor' 
  } // Link to the specific Lab that offers this
}, { timestamps: true });

export { LabCatalogItemSchema };
export default model('LabCatalogItem', LabCatalogItemSchema);