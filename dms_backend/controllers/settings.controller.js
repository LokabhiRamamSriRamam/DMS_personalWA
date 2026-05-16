// ── Booking Settings ──────────────────────────────────────────────────────────

export async function getBookingSettings(req, res) {
  try {
    const { BookingSettings } = req.tenantModels;
    const settings = await BookingSettings.findOne().lean();
    res.json(settings || {});
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

export async function saveBookingSettings(req, res) {
  try {
    const { BookingSettings } = req.tenantModels;
    // Strip Mongoose/MongoDB metadata that cannot be $set
    const { _id, __v, createdAt, updatedAt, ...body } = req.body;
    const settings = await BookingSettings.findOneAndUpdate(
      {},
      { $set: body },
      { new: true, upsert: true, runValidators: true }
    );
    res.json(settings);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
}

// ── Invoice Settings ──────────────────────────────────────────────────────────

export async function getInvoiceSettings(req, res) {
  try {
    const { InvoiceSettings } = req.tenantModels;
    const settings = await InvoiceSettings.findOne().lean();
    res.json(settings || {});
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

export async function saveInvoiceSettings(req, res) {
  try {
    const { InvoiceSettings } = req.tenantModels;
    const { _id, __v, createdAt, updatedAt, ...body } = req.body;
    const settings = await InvoiceSettings.findOneAndUpdate(
      {},
      { $set: body },
      { new: true, upsert: true, runValidators: true }
    );
    res.json(settings);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
}

// ── Doctor Schedule ───────────────────────────────────────────────────────────

export async function getDoctorSchedule(req, res) {
  try {
    const { Doctor } = req.tenantModels;
    const doctor = await Doctor.findById(req.params.id)
      .select('name isBookable bookingWorkingHours holidays blockedSlots')
      .lean();
    if (!doctor) return res.status(404).json({ message: 'Doctor not found' });
    res.json(doctor);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

export async function saveDoctorSchedule(req, res) {
  try {
    const { Doctor } = req.tenantModels;
    const allowed = ['isBookable', 'bookingWorkingHours', 'holidays', 'blockedSlots'];
    const update = { $set: {} };
    for (const k of allowed) if (req.body[k] !== undefined) update.$set[k] = req.body[k];
    const doctor = await Doctor.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!doctor) return res.status(404).json({ message: 'Doctor not found' });
    res.json(doctor);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
}
