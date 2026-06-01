import mongoose, { Schema, model, models } from "mongoose";

const ErrorLogSchema = new Schema(
  {
    date: { type: String, required: true, index: true }, // logged date YYYY-MM-DD
    source: { type: String, default: "" }, // mock/practice name
    section: { type: String, default: "QA" }, // QA / VARC-RC / VARC-VA / DI / LR
    topic: { type: String, default: "" },
    cause: { type: String, default: "concept gap" },
    description: { type: String, default: "" },
    status: { type: String, default: "open" }, // open / resolved
    reviewsDone: { type: Number, default: 0 },
    nextReview: { type: String, default: "" }, // YYYY-MM-DD
    lrSetType: { type: String, default: "" }, // optional, for LR errors
  },
  { timestamps: true }
);

export default (models.ErrorLog as mongoose.Model<any>) || model("ErrorLog", ErrorLogSchema);
