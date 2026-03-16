import Appointment from '../models/Appointment.model.js';

// GET /api/appointments?date=2025-12-25
export async function getAppointments(req, res) {
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
    .populate('doctor_id', 'name');

    res.json(appointments);
  } catch (err) { res.status(500).json({ error: err.message }); }
}

// POST /api/appointments
export async function createAppointment(req, res) {
  try {
    const newAppt = new Appointment(req.body);
    await newAppt.save();
    res.status(201).json(newAppt);
  } catch (err) { res.status(400).json({ error: err.message }); }
}

// PATCH /api/appointments/:id/status
export async function updateStatus(req, res) {
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
  try {
    const appt = await Appointment.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(appt);
  } catch (err) { res.status(400).json({ error: err.message }); }
}