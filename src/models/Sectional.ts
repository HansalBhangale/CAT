import mongoose, { Schema, model, models } from "mongoose";

// A chapter-level sectional / topic test (separate from full Mocks).
const SectionalSchema = new Schema(
  {
    date: { type: String, required: true, index: true }, // YYYY-MM-DD
    area: { type: String, default: "QA" }, // QA / VARC / DILR / DI / LR / RC / VA / Other
    chapter: { type: String, required: true }, // e.g. "Time-Speed-Distance"
    testRef: { type: String, default: "" }, // test reference id, e.g. "TIME-QA-12"
    marks: { type: Number, default: 0 },
    maxMarks: { type: Number, default: 0 },
    percentile: { type: Number, default: 0 },
    notes: { type: String, default: "" },
  },
  { timestamps: true }
);

export default (models.Sectional as mongoose.Model<any>) || model("Sectional", SectionalSchema);
