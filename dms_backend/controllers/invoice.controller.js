import Invoice from "../models/Invoice.model.js";

export const createInvoice = async (req, res) => {
  const invoice = await Invoice.create(req.body);
  res.status(201).json(invoice);
};

export const getInvoices = async (req, res) => {
  const invoices = await Invoice.find();
  res.json(invoices);
};

export const getInvoiceById = async (req, res) => {
  const invoice = await Invoice.findById(req.params.id);
  res.json(invoice);
};
