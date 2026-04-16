import { logEvent } from '../services/analyticsLogger.js';

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
    const newAppt = new Appointment(req.body);
    const saved = await newAppt.save();

    // Log to analytics
    logEvent(req.user.tenantId, 'appointment_created', { appointmentId: saved._id, status: saved.status });

    res.status(201).json(saved);
  } catch (err) { res.status(400).json({ error: err.message }); }
}

// PATCH /api/appointments/:id/status
export async function updateStatus(req, res) {
  const { Appointment } = req.tenantModels;
  try {
    const { status } = req.body; 
    const appt = await Appointment.findByIdAndUpdate(
      req.params.id, 
      { status }, 
      { new: true }
    );
    res.json(appt);
  } catch (err) { res.status(400).json({ error: err.message }); }
}

// PUT /api/appointments/:id
export async function updateAppointment(req, res) {
  const { Appointment } = req.tenantModels;
  try {
    const appt = await Appointment.findByIdAndUpdate(req.params.id, req.body, { new: true });
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

    // --- Month date range ---
    const monthStart = new Date(searchDate.getFullYear(), searchDate.getMonth(), 1);
    const monthEnd = new Date(searchDate.getFullYear(), searchDate.getMonth() + 1, 0, 23, 59, 59, 999);

    const [visits, labOrders, monthlyInvoices] = await Promise.all([
      // Visits on the selected date
      Visit.find({ date: { $gte: dayStart, $lte: dayEnd } }, 'treatments').lean(),
      // Lab orders on the selected date
      LabOrder.find({ order_date: { $gte: dayStart, $lte: dayEnd } }, 'cost_to_clinic items').lean(),
      // Outstanding invoices for the month
      Invoice.find({
        date: { $gte: monthStart, $lte: monthEnd },
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