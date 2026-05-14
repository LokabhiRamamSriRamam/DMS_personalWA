export async function listFlows(req, res) {
  try {
    const { ChatbotFlow } = req.tenantModels;
    const flows = await ChatbotFlow.find({ isTemplate: false }).sort({ createdAt: -1 }).lean();
    res.json(flows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

export async function getFlow(req, res) {
  try {
    const { ChatbotFlow } = req.tenantModels;
    const flow = await ChatbotFlow.findById(req.params.id).lean();
    if (!flow) return res.status(404).json({ message: 'Flow not found' });
    res.json(flow);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

export async function createFlow(req, res) {
  try {
    const { ChatbotFlow } = req.tenantModels;
    const { name, description, triggerType, triggerKeywords, treatmentName, reminderOffsetHours } = req.body;
    const flow = await ChatbotFlow.create({
      name, description, triggerType, triggerKeywords, treatmentName,
      reminderOffsetHours: reminderOffsetHours ?? 24,
      isActive: false,
      isTemplate: false,
      nodes: [],
      edges: [],
    });
    res.status(201).json(flow);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
}

export async function updateFlow(req, res) {
  try {
    const { ChatbotFlow } = req.tenantModels;
    const allowed = ['name', 'description', 'triggerType', 'triggerKeywords', 'treatmentName',
                     'reminderOffsetHours', 'nodes', 'edges', 'rootNodeId', 'isActive'];
    const update = {};
    for (const k of allowed) if (req.body[k] !== undefined) update[k] = req.body[k];
    const flow = await ChatbotFlow.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!flow) return res.status(404).json({ message: 'Flow not found' });
    res.json(flow);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
}

export async function deleteFlow(req, res) {
  try {
    const { ChatbotFlow } = req.tenantModels;
    const flow = await ChatbotFlow.findByIdAndDelete(req.params.id);
    if (!flow) return res.status(404).json({ message: 'Flow not found' });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

export async function toggleFlow(req, res) {
  try {
    const { ChatbotFlow } = req.tenantModels;
    const flow = await ChatbotFlow.findById(req.params.id);
    if (!flow) return res.status(404).json({ message: 'Flow not found' });
    flow.isActive = !flow.isActive;
    await flow.save();
    res.json({ isActive: flow.isActive });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

export async function listTemplates(req, res) {
  try {
    const { ChatbotFlow } = req.tenantModels;
    const templates = await ChatbotFlow.find({ isTemplate: true }).sort({ triggerType: 1 }).lean();
    res.json(templates);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

export async function duplicateFlow(req, res) {
  try {
    const { ChatbotFlow } = req.tenantModels;
    const source = await ChatbotFlow.findById(req.params.id).lean();
    if (!source) return res.status(404).json({ message: 'Flow not found' });
    const { _id, createdAt, updatedAt, __v, ...rest } = source;
    const copy = await ChatbotFlow.create({
      ...rest,
      name: source.isTemplate ? source.name : `${source.name} (copy)`,
      isActive: false,
      isTemplate: false,
    });
    res.status(201).json(copy);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
}
