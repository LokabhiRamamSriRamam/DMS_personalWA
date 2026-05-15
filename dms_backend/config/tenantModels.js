import { PatientSchema }            from '../models/Patient.model.js';
import { VisitSchema }              from '../models/Visit.model.js';
import { AppointmentSchema }        from '../models/Appointment.model.js';
import { InvoiceSchema }            from '../models/Invoice.model.js';
import { TransactionSchema }        from '../models/Transaction.model.js';
import { InventoryItemSchema }      from '../models/InventoryItem.model.js';
import { InventoryLogSchema }       from '../models/InventoryLog.model.js';
import { OrderSchema }              from '../models/Order.model.js';
import { VendorSchema }             from '../models/Vendor.model.js';
import { LabCatalogItemSchema }     from '../models/LabCatalogItem.model.js';
import { LabOrderSchema }           from '../models/LabOrder.model.js';
import { ServiceSchema }            from '../models/Services.model.js';
import DoctorModel                  from '../models/Doctor.model.js'; // keep for ClinicalFinding/Diagnosis refs
import ClinicalFindingModel         from '../models/ClinicalFinding.model.js';
import DiagnosisModel               from '../models/Diagnosis.model.js';
import SuggestedTreatmentModel      from '../models/SuggestedTreatment.model.js';
import { PollResponseSchema }       from '../models/PollResponse.model.js';

import { PollTemplateSchema }       from '../models/PollTemplate.model.js';
import { EmailSettingsSchema }      from '../models/EmailSettings.model.js';
import { InventorySettingsSchema }  from '../models/InventorySettings.model.js';
import { EmailTemplateSchema }      from '../models/EmailTemplate.model.js';
import { EmailLogSchema }           from '../models/EmailLog.model.js';
import { ReportJobSchema }          from '../models/ReportJob.model.js';
import { WaSenderConfigSchema }     from '../models/WaSenderConfig.model.js';
import { WaSenderMessageSchema }    from '../models/WaSenderMessage.model.js';
import { ChatbotFlowSchema }        from '../models/ChatbotFlow.model.js';
import { ChatbotSessionSchema }     from '../models/ChatbotSession.model.js';
import { ScheduledMessageSchema }   from '../models/ScheduledMessage.model.js';
import { FlowLogSchema }            from '../models/FlowLog.model.js';
import { BookingSettingsSchema }    from '../models/BookingSettings.model.js';
import { DoctorSchema }             from '../models/Doctor.model.js';

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
    Doctor:          getOrCreate('Doctor',          DoctorSchema),
    ClinicalFinding:    getOrCreate('ClinicalFinding',    ClinicalFindingModel.schema),
    Diagnosis:          getOrCreate('Diagnosis',          DiagnosisModel.schema),
    SuggestedTreatment: getOrCreate('SuggestedTreatment', SuggestedTreatmentModel.schema),
    PollResponse:       getOrCreate('PollResponse',       PollResponseSchema),

    PollTemplate:       getOrCreate('PollTemplate',       PollTemplateSchema),
    EmailSettings:      getOrCreate('EmailSettings',      EmailSettingsSchema),
    InventorySettings:  getOrCreate('InventorySettings',  InventorySettingsSchema),
    EmailTemplate:      getOrCreate('EmailTemplate',      EmailTemplateSchema),
    EmailLog:           getOrCreate('EmailLog',           EmailLogSchema),
    ReportJob:          getOrCreate('ReportJob',          ReportJobSchema),

    WaSenderConfig:     getOrCreate('WaSenderConfig',     WaSenderConfigSchema),
    WaSenderMessage:    getOrCreate('WaSenderMessage',    WaSenderMessageSchema),
    ChatbotFlow:        getOrCreate('ChatbotFlow',        ChatbotFlowSchema),
    ChatbotSession:     getOrCreate('ChatbotSession',     ChatbotSessionSchema),
    ScheduledMessage:   getOrCreate('ScheduledMessage',   ScheduledMessageSchema),
    FlowLog:            getOrCreate('FlowLog',            FlowLogSchema),
    BookingSettings:    getOrCreate('BookingSettings',    BookingSettingsSchema),
  };

  return conn._dmsModels;
}
