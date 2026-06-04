import { triggerFlow }            from '../services/chatbot.service.js';
import { io }                      from '../index.js';
import { triggerAppointmentBooked } from './email.controller.js';
import { scheduleReminder }         from './appointment.controller.js';

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

// Collapse an array of {start,end} time-ranges into a single open span whose
// inter-range gaps become breaks — so the existing slot generator handles it.
function shiftsToDaySchedule(rawShifts) {
  const shifts = (rawShifts || [])
    .filter(s => s && s.start && s.end)
    .map(s => ({ start: timeToMinutes(s.start), end: timeToMinutes(s.end) }))
    .filter(s => s.end > s.start)
    .sort((a, b) => a.start - b.start);

  if (shifts.length === 0) return { isOpen: false };

  const breaks = [];
  for (let i = 1; i < shifts.length; i++) {
    if (shifts[i].start > shifts[i - 1].end) {
      breaks.push({ start: minutesToTime(shifts[i - 1].end), end: minutesToTime(shifts[i].start) });
    }
  }

  return {
    isOpen: true,
    start:  minutesToTime(shifts[0].start),
    end:    minutesToTime(shifts[shifts.length - 1].end),
    breaks,
  };
}

// Build the effective per-day online-booking schedule for a doctor.
// When `useCustomBookingSchedule` is true, use `bookingWorkingHours` (preferring
// explicit shifts, falling back to legacy start/end+breaks). Otherwise reuse the
// Doctors-tab `availability` shifts.
function effectiveDaySchedule(doctor, dayName) {
  if (doctor.useCustomBookingSchedule) {
    const day = doctor.bookingWorkingHours?.[dayName] || {};
    if (!day.isOpen) return { isOpen: false };
    if (Array.isArray(day.shifts) && day.shifts.length > 0) return shiftsToDaySchedule(day.shifts);
    return day;
  }
  return shiftsToDaySchedule(doctor.availability?.[dayName]);
}

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
    // Build the slot's UTC instant from its IST wall-clock time (server-tz independent),
    // matching how appointments are stored, so overlap detection is correct everywhere.
    const IST_OFFSET = 5.5 * 60 * 60 * 1000;
    const slotStart = new Date(
      Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), Math.floor(cur / 60), cur % 60, 0, 0) - IST_OFFSET
    );
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
        .select('name specialization qualification experience_years bookingWorkingHours availability useCustomBookingSchedule holidays')
        .lean(),
    ]);

    if (settings && !settings.isBookingEnabled) {
      return res.json({ bookingEnabled: false });
    }

    // Expose the effective booking schedule (custom or reused availability)
    const doctorsOut = doctors.map(doc => {
      const bookingWorkingHours = {};
      for (let i = 0; i < 7; i++) bookingWorkingHours[DAY_NAMES[i]] = effectiveDaySchedule(doc, DAY_NAMES[i]);
      const { availability, useCustomBookingSchedule, ...rest } = doc;
      return { ...rest, bookingWorkingHours };
    });

    res.json({
      bookingEnabled:  true,
      clinicName:      settings?.clinicDisplayName || req.tenantName,
      clinicTagline:   settings?.clinicTagline || '',
      clinicLogoUrl:   settings?.clinicLogoUrl || '',
      slotDuration:    settings?.slotDurationMinutes || 30,
      blockedDates:    settings?.blockedDates || [],
      doctors: doctorsOut,
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
    const daySchedule = effectiveDaySchedule(doctor, dayName);

    // Clinic-level blocked date check (compare as YYYY-MM-DD strings to avoid TZ shift)
    const clinicBlocked = (settings?.blockedDates || []).some(b => {
      const bd = new Date(b.date);
      return isSameDay(parseLocalDate(`${bd.getUTCFullYear()}-${String(bd.getUTCMonth()+1).padStart(2,'0')}-${String(bd.getUTCDate()).padStart(2,'0')}`), date);
    });
    if (clinicBlocked) return res.json({ slots: [] });

    // The booking day is an IST calendar day. Build its UTC boundaries explicitly
    // (server-tz independent) so the appointment window aligns with the IST slot
    // instants computed in generateSlots — otherwise early/late IST appointments
    // would fall outside the window and slots would wrongly appear available.
    const IST_OFFSET = 5.5 * 60 * 60 * 1000;
    const dayStart = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0) - IST_OFFSET);
    const dayEnd   = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999) - IST_OFFSET);

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

    if (!doctorId || !dateStr || !time || !patientData.phone || !patientData.name?.trim()) {
      return res.status(400).json({ message: 'doctorId, date, time, patient name and phone are required' });
    }

    const settings = await BookingSettings.findOne().lean();
    if (settings && !settings.isBookingEnabled) {
      return res.status(403).json({ message: 'Online booking is currently disabled' });
    }

    const doctor = await Doctor.findById(doctorId).lean();
    if (!doctor?.isBookable) return res.status(400).json({ message: 'Doctor not available for online booking' });

    // The selected time is an IST wall-clock time. Build the corresponding UTC
    // instant explicitly (server-tz independent): IST = UTC + 5:30. This matches
    // how slots are generated and how dashboard appointments are stored.
    const [h, m] = time.split(':').map(Number);
    const slotDuration = settings?.slotDurationMinutes || 30;
    const [y, mo, d] = dateStr.split('-').map(Number);
    const IST_OFFSET = 5.5 * 60 * 60 * 1000;
    const start_time = new Date(Date.UTC(y, mo - 1, d, h, m, 0, 0) - IST_OFFSET);
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
      status: 'Requested',
      source: 'online',
      notes:  patientData.chiefComplaint || '',
    });

    // Notify clinic staff in real time
    io.to(`tenant:${req.tenantId}`).emit('booking:new', {
      appointmentId:   appt._id.toString(),
      patientName:     `${patient.first_name} ${patient.last_name}`.trim(),
      date:            start_time.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' }),
      time:            start_time.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' }),
      doctorName:      doctor.name,
      appointmentDate: dateStr, // YYYY-MM-DD — for frontend navigation
    });

    // Email automation (same as dashboard-created appointments)
    triggerAppointmentBooked({ tenantModels: req.tenantModels, appointment: appt }).catch(() => {});

    // Schedule appointment reminder (same as dashboard-created appointments)
    scheduleReminder(req.tenantModels, appt);

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
