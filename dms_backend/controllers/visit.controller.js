import Visit from "../models/Visit.model.js";

export const createVisit = async (req, res) => {
  const visit = await Visit.create(req.body);
  res.status(201).json(visit);
};

export const getVisits = async (req, res) => {
  const visits = await Visit.find().populate("patient_id");
  res.json(visits);
};

export const getVisitById = async (req, res) => {
  const visit = await Visit.findById(req.params.id);
  res.json(visit);
};
