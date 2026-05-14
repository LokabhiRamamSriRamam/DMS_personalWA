import { logEvent } from '../services/analyticsLogger.js';
import { triggerAppointmentCompleted } from './email.controller.js';
import { triggerFlow } from '../services/chatbot.service.js';

// Fetch session API key + trigger a WaSender flow (fire-and-forget)
async function fireFlow(tenantModels, triggerType, phone, templateData, options = {}) {
  try {
    const config = await tenantModels.WaSenderConfig?.findOne({ isActive: true });
    if (!config?.sessionApiKey) return;
    await triggerFlow(tenantModels, config.sessionApiKey, triggerType, phone, templateData, options);
  } catch (err) {
    console.error('[appointment] fireFlow error', triggerType, err.message);
  }
}

function formatDate(d) {
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' });
}
function formatTime(d) {
  return new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' });
}

async function buildApptTemplateData(tenantModels, appt) {
  try {
    const patient = await tenantModels.Patient?.findById(appt.patient_id).select('first_name last_name contact').lean();
    const doctor  = await tenantModels.Doctor?.findById(appt.doctor_id).select('name').lean();
    return {
      name:       patient ? `${patient.first_name} ${patient.last_name}` : '',
      firstName:  patient?.first_name || '',
      phone:      patient?.contact?.mobile || '',
      date:       formatDate(appt.start_time),
      time:       formatTime(appt.start_time),
      doctorName: doctor?.name || '',
    };
  } catch { return {}; }
}

async function scheduleReminder(tenantModels, appt) {
  try {
    const { ChatbotFlow, ScheduledMessage, WaSenderConfig } = tenantModels;
    const config = await WaSenderConfig?.findOne({ isActive: true });
    if (!config?.sessionApiKey) return;
    // Cancel any existing pending reminder for this appointment
    await ScheduledMessage?.deleteMany({ 'templateData.appointmentId': String(appt._id), status: 'pending' });
    const flow = await ChatbotFlow?.findOne({ triggerType: 'appointment_reminder', isActive: true, isTemplate: false });
    if (!flow) return;
    const rootNode = (flow.nodes || []).find(n => n.id === flow.rootNodeId) || flow.nodes?.[0];
    if (!rootNode) return;
    const offsetHours = flow.reminderOffsetHours ?? 24;
    const scheduledAt = new Date(new Date(appt.start_time).getTime() - offsetHours * 3_600_000);
    if (scheduledAt <= new Date()) return; // already past
    const templateData = await buildApptTemplateData(tenantModels, appt);
    templateData.appointmentId = String(appt._id);
    const patient = await tenantModels.Patient?.findById(appt.patient_id).select('contact').lean();
    const phone = patient?.contact?.mobile;
    if (!phone) return;
    await ScheduledMessage?.create({
      sessionApiKey: config.sessionApiKey,
      phone,
      flowId: flow._id,
      nextNodeId: rootNode.id,
      templateData,
      scheduledAt,
    });
  } catch (err) {
    console.error('[appointment] scheduleReminder error', err.message);
  }
}

// GET /api/appointments?date=2025-12-25
export async function getAppointments(req, res) {
  const { Appointment } = req.tenantModels;
  try {
    const { date } = req.query;
    // Default to today if no date provided
    const searchDate = date ? new Date(date) : new Date();
    
    const start = new Date(searchDate); start.setHours(0,0,0,0);
    const end = new Date(searchDate); end.setHours(23,59,59,999);

    const appointments = await Appointment.find({
      start_time: { $gte: start, $lte: end }
    })
    .populate('patient_id', 'first_name last_name contact.mobile')
    // doctor_id refers to dms_users in analyticsDb, but populate depends on models being on the same connection.
    // Since doctor_id is a Ref to 'User' (which we don't host on tenantDb now), 
    // manual lookup might be needed, or we just return the ID for now.
    // However, the user plan says models for clinic operational data live in tenantDb.
    // The previous code populated 'doctor_id' from 'User'. 
    // Since 'User' (clinic staff) is now in analyticsDb, populate will NOT work across connections easily.
    // I will remove the populate for doctor_id and let the frontend handle it or do a manual lookup if needed.
    // Actually, I'll keep it as-is for patient_id (which IS on tenantDb) and remove doctor_id populate.
    .populate('patient_id'); 

    res.json(appointments);
  } catch (err) { res.status(500).json({ error: err.message }); }
}

// GET /api/appointments/patient/:patientId
export async function getPatientAppointments(req, res) {
  const { Appointment } = req.tenantModels;
  try {
    const appointments = await Appointment.find({ patient_id: req.params.patientId })
      .sort({ start_time: 1 });
    res.json(appointments);
  } catch (err) { res.status(500).json({ error: err.message }); }
}

// POST /api/appointments
export async function createAppointment(req, res) {
  const { Appointment } = req.tenantModels;
  try {
    if (req.body.start_time) {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      if (new Date(req.body.start_time) < oneHourAgo) {
        return res.status(400).json({ error: 'Cannot book an appointment more than 1 hour in the past.' });
      }
    }

    // Check if the doctor already has an appointment at the exact same start time
    if (req.body.doctor_id && req.body.start_time) {
      const conflictingAppt = await Appointment.findOne({
        doctor_id: req.body.doctor_id,
        status: { $ne: 'Cancelled' },
        start_time: new Date(req.body.start_time),
      });

      if (conflictingAppt) {
        return res.status(400).json({ error: 'Doctor already has an appointment at this time. Please choose a different time slot.' });
      }
    }

    const newAppt = new Appointment(req.body);
    const saved = await newAppt.save();

    // Log to analytics
    logEvent(req.user.tenantId, 'appointment_created', { appointmentId: saved._id, status: saved.status });

    // WaSender flows (fire-and-forget)
    buildApptTemplateData(req.tenantModels, saved).then(templateData => {
      const phone = templateData.phone;
      if (phone) {
        fireFlow(req.tenantModels, 'appointment_booked', phone, templateData);
        scheduleReminder(req.tenantModels, saved);
      }
    });

    res.status(201).json(saved);
  } catch (err) { res.status(400).json({ error: err.message }); }
}

// PATCH /api/appointments/:id/status
export async function updateStatus(req, res) {
  const { Appointment } = req.tenantModels;
  try {
    const { status } = req.body;
    const currentAppt = await Appointment.findById(req.params.id);


    const appt = await Appointment.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    // Fire-and-forget email on completion
    if (status === 'Completed' && appt?.patient_id) {
      triggerAppointmentCompleted({
        tenantModels: req.tenantModels,
        patientId: appt.patient_id.toString(),
        doctorName: req.user?.name || 'Attending Doctor',
      });
    }

    // WaSender flows (fire-and-forget)
    if (['Completed', 'Confirmed', 'Cancelled'].includes(status) && appt?.patient_id) {
      buildApptTemplateData(req.tenantModels, appt).then(templateData => {
        const phone = templateData.phone;
        if (!phone) return;
        if (status === 'Completed')  fireFlow(req.tenantModels, 'appointment_completed',  phone, templateData);
        if (status === 'Confirmed')  fireFlow(req.tenantModels, 'appointment_confirmed',  phone, templateData);
      });
    }

    res.json(appt);
  } catch (err) { res.status(400).json({ error: err.message }); }
}

// PUT /api/appointments/:id
export async function updateAppointment(req, res) {
  const { Appointment } = req.tenantModels;
  try {
    if (req.body.start_time) {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      if (new Date(req.body.start_time) < oneHourAgo) {
        return res.status(400).json({ error: 'Cannot reschedule an appointment more than 1 hour in the past.' });
      }
    }

    // Check if the doctor already has an appointment at the exact same start time
    if (req.body.doctor_id || req.body.start_time) {
      const existingAppt = await Appointment.findById(req.params.id);
      const doctorId = req.body.doctor_id || existingAppt?.doctor_id;
      const proposedStart = new Date(req.body.start_time || existingAppt?.start_time);

      if (doctorId && proposedStart) {
        const conflictingAppt = await Appointment.findOne({
          _id: { $ne: req.params.id },
          doctor_id: doctorId,
          status: { $ne: 'Cancelled' },
          start_time: proposedStart,
        });

        if (conflictingAppt) {
          return res.status(400).json({ error: 'Doctor already has an appointment at this time. Please choose a different time slot.' });
        }
      }
    }

    const prevAppt = await Appointment.findById(req.params.id).lean();
    const appt = await Appointment.findByIdAndUpdate(req.params.id, req.body, { new: true });

    // If start_time changed → fire rescheduled flow + reschedule reminder
    if (appt && req.body.start_time && prevAppt &&
        String(prevAppt.start_time) !== String(appt.start_time)) {
      buildApptTemplateData(req.tenantModels, appt).then(templateData => {
        const phone = templateData.phone;
        if (phone) {
          fireFlow(req.tenantModels, 'appointment_rescheduled', phone, templateData);
          scheduleReminder(req.tenantModels, appt);
        }
      });
    }

    res.json(appt);
  } catch (err) { res.status(400).json({ error: err.message }); }
}

// GET /api/appointments/dashboard-stats?date=YYYY-MM-DD
// Returns today's revenue (treatments + lab orders done on that date) and monthly outstanding
export async function getDashboardStats(req, res) {
  const { Visit, LabOrder, Invoice } = req.tenantModels;
  try {
    const { date } = req.query;
    const searchDate = date ? new Date(date) : new Date();

    // --- Today's date range ---
    const dayStart = new Date(searchDate); dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(searchDate); dayEnd.setHours(23, 59, 59, 999);

    const [visits, labOrders, monthlyInvoices] = await Promise.all([
      // Visits on the selected date
      Visit.find({ date: { $gte: dayStart, $lte: dayEnd } }, 'treatments').lean(),
      // Lab orders on the selected date
      LabOrder.find({ order_date: { $gte: dayStart, $lte: dayEnd } }, 'cost_to_clinic items').lean(),
      // Outstanding invoices overall
      Invoice.find({
        pending_amount: { $gt: 0 },
        status: { $ne: 'Cancelled' },
      }, 'pending_amount').lean(),
    ]);

    // Today's revenue: completed treatments cost (excl Missing)
    let treatmentRevenue = 0;
    for (const v of visits) {
      for (const t of (v.treatments || [])) {
        if (t.treatment_name !== 'Missing') {
          treatmentRevenue += (Number(t.cost) || 0) * (Number(t.qty) || 1);
        }
      }
    }

    // Today's lab order value
    let labRevenue = 0;
    for (const lo of labOrders) {
      for (const item of (lo.items || [])) {
        labRevenue += Number(item.cost) || 0;
      }
    }

    // Monthly outstanding
    let outstandingAmount = 0;
    for (const inv of monthlyInvoices) {
      outstandingAmount += Number(inv.pending_amount) || 0;
    }

    res.json({
      todays_revenue: treatmentRevenue + labRevenue,
      treatment_revenue: treatmentRevenue,
      lab_revenue: labRevenue,
      outstanding_amount: outstandingAmount,
      outstanding_count: monthlyInvoices.length,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
}