import Appointment from "../models/Appointment.model.js";

export const createAppointment = async (req, res) => {
  const appointment = await Appointment.create(req.body);
  res.status(201).json(appointment);
};

export const getAppointments = async (req, res) => {
  const appointments = await Appointment.find();
  res.json(appointments);
};

export const updateAppointmentStatus = async (req, res) => {
  const appointment = await Appointment.findByIdAndUpdate(
    req.params.id,
    { status: req.body.status },
    { new: true }
  );
  res.json(appointment);
};
