import { FollowUp } from "../models/FollowUp.js";
export async function listFollowUps(req, res) {
  const filter =
    req.user.role === "FIELD_WORKER" ? { assignedTo: req.user._id } : {};
  const data = await FollowUp.find(filter)
    .populate("farmer survey assignedTo")
    .sort({ followUpDate: 1 });
  res.json({ success: true, data });
}
export async function createFollowUp(req, res) {
  const data = await FollowUp.create({
    ...req.body,
    assignedTo: req.body.assignedTo || req.user._id,
  });
  res.status(201).json({ success: true, data });
}
export async function updateFollowUp(req, res) {
  const data = await FollowUp.findByIdAndUpdate(
    req.params.id,
    {
      $set: req.body,
      ...(req.body.status === "COMPLETED"
        ? { $set: { ...req.body, completedAt: new Date() } }
        : {}),
    },
    { new: true, runValidators: true },
  );
  if (!data)
    return res
      .status(404)
      .json({
        success: false,
        message: "Follow-up not found",
        error: "FOLLOWUP_NOT_FOUND",
      });
  res.json({ success: true, data });
}
