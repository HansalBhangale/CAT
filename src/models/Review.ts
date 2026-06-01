import mongoose, { Schema, model, models } from "mongoose";

const ReviewSchema = new Schema(
  {
    type: { type: String, required: true }, // weekly / monthly
    periodKey: { type: String, required: true, index: true }, // weekStart (YYYY-MM-DD) or month (YYYY-MM)
    processFix: { type: String, default: "" },
    lrSetTypeAccuracy: { type: String, default: "" },
    syllabusCoverage: {
      QA: { type: Number, default: 0 },
      DILR: { type: Number, default: 0 },
      VARC: { type: Number, default: 0 },
    },
    phaseGoalsMet: { type: String, default: "" },
    adjustments: { type: String, default: "" },
    notes: { type: String, default: "" },
  },
  { timestamps: true }
);

ReviewSchema.index({ type: 1, periodKey: 1 }, { unique: true });

export default (models.Review as mongoose.Model<any>) || model("Review", ReviewSchema);
