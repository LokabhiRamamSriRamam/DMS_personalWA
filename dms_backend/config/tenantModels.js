import { PatientSchema }       from '../models/Patient.model.js';
import { VisitSchema }         from '../models/Visit.model.js';
import { AppointmentSchema }   from '../models/Appointment.model.js';
import { InvoiceSchema }       from '../models/Invoice.model.js';
import { TransactionSchema }   from '../models/Transaction.model.js';
import { InventoryItemSchema } from '../models/InventoryItem.model.js';
import { InventoryLogSchema }  from '../models/InventoryLog.model.js';
import { OrderSchema }         from '../models/Order.model.js';
import { VendorSchema }        from '../models/Vendor.model.js';
import { LabCatalogItemSchema }from '../models/LabCatalogItem.model.js';
import { LabOrderSchema }      from '../models/LabOrder.model.js';
import { ServiceSchema }       from '../models/Services.model.js';

/**
 * Returns all clinic Mongoose models bound to the given tenant connection.
 * Caches the result on conn._dmsModels to avoid re-registering schemas.
 */
export function getTenantModels(conn) {
  if (conn._dmsModels) return conn._dmsModels;

  const getOrCreate = (name, schema) =>
    conn.modelNames().includes(name) ? conn.model(name) : conn.model(name, schema);

  conn._dmsModels = {
    Patient:         getOrCreate('Patient',         PatientSchema),
    Visit:           getOrCreate('Visit',           VisitSchema),
    Appointment:     getOrCreate('Appointment',     AppointmentSchema),
    Invoice:         getOrCreate('Invoice',         InvoiceSchema),
    Transaction:     getOrCreate('Transaction',     TransactionSchema),
    InventoryItem:   getOrCreate('InventoryItem',   InventoryItemSchema),
    InventoryLog:    getOrCreate('InventoryLog',    InventoryLogSchema),
    Order:           getOrCreate('Order',           OrderSchema),
    Vendor:          getOrCreate('Vendor',          VendorSchema),
    LabCatalogItem:  getOrCreate('LabCatalogItem',  LabCatalogItemSchema),
    LabOrder:        getOrCreate('LabOrder',        LabOrderSchema),
    Service:         getOrCreate('Service',         ServiceSchema),
  };

  return conn._dmsModels;
}
