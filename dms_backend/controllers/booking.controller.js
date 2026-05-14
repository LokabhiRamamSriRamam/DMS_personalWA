import { triggerFlow } from '../services/chatbot.service.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

function timeToMinutes(str) {
  if (!str) return 0;
  const [h, m] = str.split(':').map(Number);
  return h * 60 + (m || 0);
}

function minutesToTime(mins) {
  return `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;
}

function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear() &&
         a.getMonth()    === b.getMonth()    &&
         a.getDate()     === b.getDate();
}

// Parse "YYYY-MM-DD" string into a local-midnight Date (avoids UTC timezone shift)
function parseLocalDate(str) {
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d, 0, 0, 0, 0);
}

const DAY_NAMES = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];

function generateSlots({ daySchedule, slotDuration, date, existingAppointments, blockedSlots, holidays }) {
  if (!daySchedule?.isOpen) return [];

  // Check doctor holiday on this date (use UTC fields to avoid TZ shift)
  if ((holidays || []).some(h => {
    const hd = new Date(h.date);
    return isSameDay(new Date(hd.getUTCFullYear(), hd.getUTCMonth(), hd.getUTCDate()), date);
  })) return [];

  const start = timeToMinutes(daySchedule.start);
  const end   = timeToMinutes(daySchedule.end);
  const now   = new Date();
  const isToday = isSameDay(date, now);
  const nowMins = now.getHours() * 60 + now.getMinutes() + 30; // 30-min buffer

  const slots = [];
  for (let cur = start; cur + slotDuration <= end; cur += slotDuration) {
    if (isToday && cur <= nowMins) continue;

    // Skip breaks
    const inBreak = (daySchedule.breaks || []).some(b =>
      cur >= timeToMinutes(b.start) && cur < timeToMinutes(b.end)
    );
    if (inBreak) continue;

    const timeStr  = minutesToTime(cur);
    const slotStart = new Date(date); slotStart.setHours(Math.floor(cur / 60), cur % 60, 0, 0);
    const slotEnd   = new Date(slotStart.getTime() + slotDuration * 60_000);

    // Skip blocked slots
    const isBlocked = (blockedSlots || []).some(bs =>
      isSameDay(new Date(bs.date), date) && bs.startTime === timeStr
    );
    if (isBlocked) continue;

    // Skip existing appointments
    const booked = (existingAppointments || []).some(a => {
      const as = new Date(a.start_time), ae = new Date(a.end_time);
      return as < slotEnd && ae > slotStart;
    });
    if (booked) continue;

    slots.push(timeStr);
  }
  return slots;
}

// ── GET /api/public/:tenantId/booking/config ──────────────────────────────────
export async function getBookingConfig(req, res) {
  try {
    const { BookingSettings, Doctor } = req.tenantModels;

    const [settings, doctors] = await Promise.all([
      BookingSettings.findOne().lean(),
      Doctor.find({ isBookable: true, is_active: true })
        .select('name specialization qualification experience_years bookingWorkingHours holidays')
        .lean(),
    ]);

    if (settings && !settings.isBookingEnabled) {
      return res.json({ bookingEnabled: false });
    }

    res.json({
      bookingEnabled:  true,
      clinicName:      settings?.clinicDisplayName || req.tenantName,
      clinicTagline:   settings?.clinicTagline || '',
      clinicLogoUrl:   settings?.clinicLogoUrl || '',
      slotDuration:    settings?.slotDurationMinutes || 30,
      blockedDates:    settings?.blockedDates || [],
      doctors,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

// ── GET /api/public/:tenantId/booking/slots?doctorId=&date= ──────────────────
export async function getAvailableSlots(req, res) {
  try {
    const { BookingSettings, Doctor, Appointment } = req.tenantModels;
    const { doctorId, date: dateStr } = req.query;

    if (!doctorId || !dateStr) return res.status(400).json({ message: 'doctorId and date are required' });

    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return res.status(400).json({ message: 'Invalid date' });
    const date = parseLocalDate(dateStr);

    const [settings, doctor] = await Promise.all([
      BookingSettings.findOne().lean(),
      Doctor.findById(doctorId).lean(),
    ]);

    if (!doctor?.isBookable) return res.json({ slots: [] });

    const slotDuration = settings?.slotDurationMinutes || 30;
    const dayName = DAY_NAMES[date.getDay()];
    const daySchedule = doctor.bookingWorkingHours?.[dayName] || {};

    // Clinic-level blocked date check (compare as YYYY-MM-DD strings to avoid TZ shift)
    const clinicBlocked = (settings?.blockedDates || []).some(b => {
      const bd = new Date(b.date);
      return isSameDay(parseLocalDate(`${bd.getUTCFullYear()}-${String(bd.getUTCMonth()+1).padStart(2,'0')}-${String(bd.getUTCDate()).padStart(2,'0')}`), date);
    });
    if (clinicBlocked) return res.json({ slots: [] });

    const dayStart = new Date(date); dayStart.setHours(0, 0, 0, 0);
    const dayEnd   = new Date(date); dayEnd.setHours(23, 59, 59, 999);

    const existingAppointments = await Appointment.find({
      doctor_id: doctorId,
      start_time: { $gte: dayStart, $lte: dayEnd },
      status: { $nin: ['Cancelled', 'No Show'] },
    }).select('start_time end_time').lean();

    const slots = generateSlots({
      daySchedule,
      slotDuration,
      date,
      existingAppointments,
      blockedSlots: doctor.blockedSlots || [],
      holidays:     doctor.holidays     || [],
    });

    res.json({ slots });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

// ── POST /api/public/:tenantId/booking ────────────────────────────────────────
export async function submitBooking(req, res) {
  try {
    const { BookingSettings, Doctor, Patient, Appointment, WaSenderConfig } = req.tenantModels;
    const { doctorId, date: dateStr, time, patient: patientData = {} } = req.body;

    if (!doctorId || !dateStr || !time || !patientData.phone) {
      return res.status(400).json({ message: 'doctorId, date, time and patient phone are required' });
    }

    const settings = await BookingSettings.findOne().lean();
    if (settings && !settings.isBookingEnabled) {
      return res.status(403).json({ message: 'Online booking is currently disabled' });
    }

    const doctor = await Doctor.findById(doctorId).lean();
    if (!doctor?.isBookable) return res.status(400).json({ message: 'Doctor not available for online booking' });

    // Parse slot into Date (use parseLocalDate to avoid UTC TZ shift)
    const [h, m] = time.split(':').map(Number);
    const slotDuration = settings?.slotDurationMinutes || 30;
    const start_time = parseLocalDate(dateStr);
    start_time.setHours(h, m, 0, 0);
    const end_time = new Date(start_time.getTime() + slotDuration * 60_000);

    // Double-check slot still free
    const conflict = await Appointment.findOne({
      doctor_id: doctorId,
      status: { $nin: ['Cancelled', 'No Show'] },
      start_time: { $lt: end_time },
      end_time:   { $gt: start_time },
    });
    if (conflict) return res.status(409).json({ message: 'This slot was just taken. Please choose another.' });

    // Find or create patient by phone
    const normalizedPhone = patientData.phone.replace(/\D/g, '');
    let patient = await Patient.findOne({ 'contact.mobile': { $regex: normalizedPhone.slice(-10) } });
    if (!patient) {
      const count = await Patient.countDocuments();
      const patientId = `PID-${String(count + 1).padStart(3, '0')}`;
      const nameParts = (patientData.name || 'Online Patient').trim().split(/\s+/);
      patient = await Patient.create({
        patientId,
        first_name: nameParts[0],
        last_name:  nameParts.slice(1).join(' ') || '',
        contact: {
          mobile: patientData.phone,
          email:  patientData.email || '',
        },
        dob:    patientData.dob    || undefined,
        gender: patientData.gender || undefined,
      });
    } else if (patientData.name && !patient.first_name) {
      const nameParts = patientData.name.trim().split(/\s+/);
      patient.first_name = nameParts[0];
      patient.last_name  = nameParts.slice(1).join(' ') || '';
      await patient.save();
    }

    const appt = await Appointment.create({
      patient_id: patient._id,
      doctor_id:  doctorId,
      start_time,
      end_time,
      title:  `Online Booking — ${patientData.name || 'Patient'}`,
      type:   'Consultation',
      status: 'Pending',
      source: 'online',
      notes:  patientData.chiefComplaint || '',
    });

    // Fire WaSender appointment_received flow
    const config = await WaSenderConfig?.findOne({ isActive: true });
    if (config?.sessionApiKey) {
      const phone = patientData.phone;
      triggerFlow(req.tenantModels, config.sessionApiKey, 'appointment_received', phone, {
        name:       `${patient.first_name} ${patient.last_name}`.trim(),
        firstName:  patient.first_name,
        phone,
        date:       start_time.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' }),
        time:       start_time.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' }),
        doctorName: doctor.name,
      }).catch(() => {});
    }

    res.status(201).json({ appointmentId: appt._id, message: 'Booking received! The clinic will confirm shortly.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}
