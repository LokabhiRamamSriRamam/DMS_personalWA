import { triggerWhatsApp, triggerJourney } from '../services/whatsapp.service.js';
import PDFDocument from 'pdfkit';
import { uploadFile } from '../services/cloudinary.service.js';

const calculateStatus = (stock, minStock) => {
  if (stock <= 0) return 'Out of Stock';
  if (stock <= minStock) return 'Critical';
  if (stock <= minStock * 1.5) return 'Low';
  return 'Good';
};

/**
 * Helper: get today's visit for a patient, or create a stub if none exists
 * Returns the MOST RECENT visit for today
 * @param {object} models - req.tenantModels
 */
async function getOrCreateTodayVisit(models, patientId) {
  const { Visit, Patient } = models;
  const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
  const endOfDay   = new Date(); endOfDay.setHours(23, 59, 59, 999);

  let visit = await Visit.findOne({
    patient_id: patientId,
    date: { $gte: startOfDay, $lte: endOfDay }
  }).sort({ date: -1 });

  if (!visit) {
    visit = await Visit.create({ patient_id: patientId, date: new Date() });
    await Patient.findByIdAndUpdate(patientId, { last_visit_date: new Date() });
  }

  return visit;
}

// POST /api/visits
export async function createVisit(req, res) {
  const { Visit, Patient } = req.tenantModels;
  try {
    const { patient_id } = req.body;

    const visit = new Visit(req.body);
    await visit.save();

    // Update Patient's last visit date
    if(patient_id) {
        await Patient.findByIdAndUpdate(patient_id, { 
          last_visit_date: new Date() 
        });
    }

    res.status(201).json(visit);
  } catch (err) { res.status(400).json({ error: err.message }); }
}

// GET /api/visits
export async function getVisits(req, res) {
  const { Visit } = req.tenantModels;
  try {
      const visits = await Visit.find().populate('patient_id');
      res.json(visits);
  } catch(err) { res.status(500).json({ error: err.message }); }
}

// GET /api/visits/:id 
export async function getVisitById(req, res) {
  const { Visit } = req.tenantModels;
  try {
      const visit = await Visit.findById(req.params.id).populate('patient_id');
      if(!visit) return res.status(404).json({error: "Visit not found"});
      res.json(visit);
  } catch(err) { res.status(500).json({ error: err.message }); }
}

// GET /api/visits/patient/:id
export async function getPatientHistory(req, res) {
  const { Visit } = req.tenantModels;
  try {
    const visits = await Visit.find({ patient_id: req.params.id })
      .populate('appointment_id')
      .sort({ date: -1 });
    res.json(visits);
  } catch (err) { res.status(500).json({ error: err.message }); }
}

// PATCH /api/visits/:visitId/notes/:noteId
export async function updateNote(req, res) {
  const { Visit } = req.tenantModels;
  try {
    const { visitId, noteId } = req.params;
    const { content } = req.body;
    if (!content) return res.status(400).json({ error: 'content is required' });

    const visit = await Visit.findOneAndUpdate(
      { _id: visitId, 'consultation_notes._id': noteId },
      { $set: { 'consultation_notes.$.content': content } },
      { new: true }
    );
    if (!visit) return res.status(404).json({ error: 'Note not found' });
    res.json(visit);
  } catch (err) { res.status(500).json({ error: err.message }); }
}

// PATCH /api/visits/:visitId/advices/:adviceId
export async function updateAdvice(req, res) {
  const { Visit } = req.tenantModels;
  try {
    const { visitId, adviceId } = req.params;
    const { content } = req.body;
    if (!content) return res.status(400).json({ error: 'content is required' });

    const visit = await Visit.findOneAndUpdate(
      { _id: visitId, 'advices._id': adviceId },
      { $set: { 'advices.$.content': content } },
      { new: true }
    );
    if (!visit) return res.status(404).json({ error: 'Advice not found' });
    res.json(visit);
  } catch (err) { res.status(500).json({ error: err.message }); }
}

// POST /api/visits/patient/:patientId/note
export async function addConsultationNote(req, res) {
  const { Visit } = req.tenantModels;
  try {
    const { content } = req.body;
    if (!content) return res.status(400).json({ error: 'content is required' });

    const visit = await getOrCreateTodayVisit(req.tenantModels, req.params.patientId);
    visit.consultation_notes.push({ content });
    await visit.save();

    res.status(201).json(visit);
  } catch (err) { res.status(500).json({ error: err.message }); }
}

// POST /api/visits/patient/:patientId/advice
export async function addAdvice(req, res) {
  const { Visit } = req.tenantModels;
  try {
    const { content } = req.body;
    if (!content) return res.status(400).json({ error: 'content is required' });

    const visit = await getOrCreateTodayVisit(req.tenantModels, req.params.patientId);
    visit.advices.push({ content });
    await visit.save();

    res.status(201).json(visit);
  } catch (err) { res.status(500).json({ error: err.message }); }
}

// POST /api/visits/patient/:patientId/prescription
export async function addPrescription(req, res) {
  const { Visit } = req.tenantModels;
  try {
    const { drug_name, dosage, duration, instructions } = req.body;
    if (!drug_name) return res.status(400).json({ error: 'drug_name is required' });

    const visit = await getOrCreateTodayVisit(req.tenantModels, req.params.patientId);
    visit.prescriptions.push({ drug_name, dosage, duration, instructions });
    await visit.save();

    // Fire-and-forget prescription notification with PDF
    req.tenantModels.Patient.findById(req.params.patientId)
      .select('first_name last_name contact patientId')
      .lean()
      .then(async patient => {
        if (!patient?.contact?.mobile) return;
        const firstName = patient.first_name;
        const fullName = `${firstName} ${patient.last_name || ''}`.trim();
        const patientId = patient._id.toString();

        let prescriptionUrl = '';
        try {
          const pdf = new PDFDocument();
          const chunks = [];
          pdf.on('data', chunk => chunks.push(chunk));
          const pdfPromise = new Promise((resolve, reject) => {
            pdf.on('end', () => resolve(Buffer.concat(chunks)));
            pdf.on('error', reject);
          });

          pdf.fontSize(18).text('Prescription', { align: 'center' });
          pdf.moveDown();
          pdf.fontSize(12).text(`Patient: ${fullName}`);
          pdf.text(`Date: ${new Date().toLocaleDateString('en-IN')}`);
          pdf.moveDown();

          pdf.fontSize(14).text('Medication Details:').moveDown();
          pdf.fontSize(11)
            .text(`Drug: ${drug_name}`)
            .text(`Dosage: ${dosage || 'N/A'}`)
            .text(`Duration: ${duration || 'N/A'}`)
            .text(`Instructions: ${instructions || 'N/A'}`);

          pdf.moveDown(2);
          pdf.fontSize(10).text('This prescription is issued by the dentist. Follow the instructions carefully.', { align: 'center' });
          pdf.end();

          const pdfBuffer = await pdfPromise;
          const fileName = `prescription-${patient.patientId}-${Date.now()}.pdf`;
          const uploadRes = await uploadFile(
            pdfBuffer,
            fileName,
            'dms/prescriptions',
            ['prescription', patient.patientId],
            req.tenantConfig
          ).catch(() => null);

          if (uploadRes?.url) {
            prescriptionUrl = uploadRes.url;
          }
        } catch (pdfErr) {
          console.error('[Prescription PDF] Generation failed:', pdfErr.message);
        }

        triggerWhatsApp(
          req.tenantModels, req.user.tenantId, process.env.WAAPI_BASE_URL,
          'prescriptionIssued',
          patient.contact.mobile,
          {
            name: fullName,
            firstName,
            patientId: patient.patientId,
            mobile: patient.contact.mobile,
            drug: drug_name,
            dosage: dosage || '',
            duration: duration || '',
            instructions: instructions || '',
            prescriptionUrl: prescriptionUrl || '',
          },
          patientId
        );
      })
      .catch(() => {});

    res.status(201).json(visit);
  } catch (err) { res.status(500).json({ error: err.message }); }
}

// POST /api/visits/patient/:patientId/treatments  (used by AI autofill)
export async function addTreatments(req, res) {
  const { Visit } = req.tenantModels;
  try {
    const { treatments } = req.body;
    if (!Array.isArray(treatments) || treatments.length === 0)
      return res.status(400).json({ error: 'treatments array is required' });

    const visit = await getOrCreateTodayVisit(req.tenantModels, req.params.patientId);
    treatments.forEach(t => {
      visit.treatments.push({
        treatment_name: t.treatment_name,
        teeth_numbers:  Array.isArray(t.teeth_numbers) ? t.teeth_numbers : [],
        cost:           t.cost   || 0,
        qty:            t.qty    || 1,
        status:         t.status || 'Planned',
      });
    });
    await visit.save();
    res.status(201).json(visit);
  } catch (err) { res.status(500).json({ error: err.message }); }
}

// DELETE /api/visits/:visitId/notes/:noteId
export async function deleteNote(req, res) {
  const { Visit } = req.tenantModels;
  try {
    const { visitId, noteId } = req.params;
    const visit = await Visit.findByIdAndUpdate(
      visitId,
      { $pull: { consultation_notes: { _id: noteId } } },
      { new: true }
    );
    if (!visit) return res.status(404).json({ error: 'Visit not found' });
    res.json(visit);
  } catch (err) { res.status(500).json({ error: err.message }); }
}

// DELETE /api/visits/:visitId/advices/:adviceId
export async function deleteAdvice(req, res) {
  const { Visit } = req.tenantModels;
  try {
    const { visitId, adviceId } = req.params;
    const visit = await Visit.findByIdAndUpdate(
      visitId,
      { $pull: { advices: { _id: adviceId } } },
      { new: true }
    );
    if (!visit) return res.status(404).json({ error: 'Visit not found' });
    res.json(visit);
  } catch (err) { res.status(500).json({ error: err.message }); }
}

// DELETE /api/visits/:visitId/treatments/:treatmentId
export async function deleteTreatment(req, res) {
  const { Visit } = req.tenantModels;
  try {
    const { visitId, treatmentId } = req.params;
    const visit = await Visit.findByIdAndUpdate(
      visitId,
      { $pull: { treatments: { _id: treatmentId } } },
      { new: true }
    );
    if (!visit) return res.status(404).json({ error: 'Visit not found' });
    res.json(visit);
  } catch (err) { res.status(500).json({ error: err.message }); }
}

// DELETE /api/visits/:visitId/prescriptions/:prescriptionId
export async function deletePrescription(req, res) {
  const { Visit } = req.tenantModels;
  try {
    const { visitId, prescriptionId } = req.params;
    const visit = await Visit.findByIdAndUpdate(
      visitId,
      { $pull: { prescriptions: { _id: prescriptionId } } },
      { new: true }
    );
    if (!visit) return res.status(404).json({ error: 'Visit not found' });
    res.json(visit);
  } catch (err) { res.status(500).json({ error: err.message }); }
}

// POST /api/visits/mark-invoiced
export async function markInvoiced(req, res) {
  const { Visit } = req.tenantModels;
  try {
    const { invoice_id, treatment_refs = [], prescription_refs = [] } = req.body;

    for (const ref of treatment_refs) {
      await Visit.updateOne(
        { _id: ref.visitId, 'treatments._id': ref.treatmentId },
        { $set: { 'treatments.$.invoice_id': invoice_id } }
      );
    }

    for (const ref of prescription_refs) {
      await Visit.updateOne(
        { _id: ref.visitId, 'prescriptions._id': ref.prescriptionId },
        { $set: { 'prescriptions.$.invoice_id': invoice_id } }
      );
    }

    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
}

// PATCH /api/visits/:visitId/treatments/:treatmentId/status
export async function updateTreatmentStatus(req, res) {
  const { Visit } = req.tenantModels;
  try {
    const { visitId, treatmentId } = req.params;
    const { status } = req.body; // 'In Progress' or 'Completed'

    const visit = await Visit.findOneAndUpdate(
      { _id: visitId, "treatments._id": treatmentId },
      {
        $set: { "treatments.$.status": status }
      },
      { new: true }
    );

    if (!visit) return res.status(404).json({ error: "Visit or Treatment not found" });

    // Fire-and-forget WhatsApp notifications on treatment completion
    if (status === 'Completed' && visit.patient_id) {
      const treatment = visit.treatments?.find(t => t._id.toString() === treatmentId);
      const completedAt = new Date();

      req.tenantModels.Patient.findById(visit.patient_id)
        .select('first_name last_name contact patientId')
        .lean()
        .then(async patient => {
          if (!patient?.contact?.mobile) return;
          const phone = patient.contact.mobile;
          const firstName = patient.first_name;
          const fullName = `${firstName} ${patient.last_name || ''}`.trim();
          const patientId = patient._id.toString();
          const data = {
            name: fullName,
            firstName,
            patientId: patient.patientId,
            mobile: phone,
            date: completedAt.toLocaleDateString('en-IN'),
            treatment: treatment?.treatment_name ?? '',
            teethNumbers: treatment?.teeth_numbers?.join(', ') ?? '',
            doctorName: visit.doctor_id ? (await req.tenantModels.Doctor?.findById(visit.doctor_id).select('name').lean() || {}).name || '' : '',
          };

          // 1. Immediate treatment-completed message
          triggerWhatsApp(
            req.tenantModels, req.user.tenantId, process.env.WAAPI_BASE_URL,
            'treatmentScheduled', phone, data, patientId
          );

          // 2. Post-care journey — only if not already started for this treatment
          if (treatment && !treatment.journey_started) {
            // Mark journey_started to prevent duplicate sends on re-complete
            await req.tenantModels.Visit.updateOne(
              { _id: visitId, 'treatments._id': treatmentId },
              { $set: { 'treatments.$.journey_started': true } }
            ).catch(() => {});

            triggerJourney(
              req.tenantModels, req.user.tenantId, process.env.WAAPI_BASE_URL,
              phone, treatment.treatment_name, completedAt, data, patientId
            );
          }
        })
        .catch(() => {});
    }

    res.json(visit);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// POST /api/visits/patient/:patientId/consumable
export async function addConsumableToVisit(req, res) {
  const { Visit, InventoryItem, InventoryLog, User } = req.tenantModels;
  try {
    const { inventory_item_id, quantity, visit_id } = req.body;
    if (!inventory_item_id || !quantity) {
      return res.status(400).json({ error: 'inventory_item_id and quantity are required' });
    }

    // Use the specific visit_id if provided, otherwise fall back to today's visit
    let visit;
    if (visit_id) {
      visit = await Visit.findById(visit_id);
      if (!visit) return res.status(404).json({ error: 'Visit not found' });
    } else {
      visit = await getOrCreateTodayVisit(req.tenantModels, req.params.patientId);
    }

    // Ensure treatments array exists and has at least one entry
    if (!visit.treatments || visit.treatments.length === 0) {
      visit.treatments.push({
        teeth_numbers: [],
        surfaces: [],
        treatment_name: 'Consumable Usage',
        cost: 0,
        qty: 1,
        status: 'Completed',
        consumables_used: []
      });
    }

    // Add to first treatment
    if (!visit.treatments[0].consumables_used) {
      visit.treatments[0].consumables_used = [];
    }

    const quantityNum = Number(quantity);
    visit.treatments[0].consumables_used.push({
      inventory_item_id,
      quantity: quantityNum
    });

    await visit.save();

    // Deduct stock and create log — both must succeed
    const invItem = await InventoryItem.findById(inventory_item_id);
    if (invItem) {
      invItem.stock_on_hand = Math.max(0, invItem.stock_on_hand - quantityNum);
      invItem.status = calculateStatus(invItem.stock_on_hand, invItem.min_stock_level);
      await invItem.save();
    }

    await InventoryLog.create({
      item_id: inventory_item_id,
      type: 'Stock Out',
      reason: 'Treatment Usage',
      quantity: quantityNum,
      reference_id: visit._id,
      performed_by: req.user?.name || req.user?.id || 'Doctor',
      date: new Date()
    });

    res.status(201).json(visit);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// DELETE /api/visits/:visitId/consumables/:itemId
export async function removeConsumableFromVisit(req, res) {
  const { Visit, InventoryItem, InventoryLog } = req.tenantModels;
  try {
    const { visitId, itemId } = req.params;

    const visit = await Visit.findById(visitId);
    if (!visit) return res.status(404).json({ error: 'Visit not found' });

    let totalQuantityRemoved = 0;

    // Remove consumable from all treatments and track quantity
    visit.treatments.forEach(t => {
      if (t.consumables_used) {
        const consumed = t.consumables_used.filter(c => c.inventory_item_id.toString() === itemId);
        consumed.forEach(c => {
          totalQuantityRemoved += c.quantity || 0;
        });
        t.consumables_used = t.consumables_used.filter(c => c.inventory_item_id.toString() !== itemId);
      }
    });

    await visit.save();

    // Restore inventory and create log
    if (totalQuantityRemoved > 0) {
      const invItem = await InventoryItem.findById(itemId);
      if (invItem) {
        invItem.stock_on_hand += totalQuantityRemoved;
        invItem.status = calculateStatus(invItem.stock_on_hand, invItem.min_stock_level);
        await invItem.save();
      }

      await InventoryLog.create({
        item_id: itemId,
        type: 'Stock In',
        reason: 'Treatment Usage Reversed',
        quantity: totalQuantityRemoved,
        reference_id: visitId,
        performed_by: req.user?.name || req.user?.id || 'Doctor',
        date: new Date()
      });
    }

    res.json(visit);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}