import mongoose, { Schema, model, models } from "mongoose";

const MockSectionSchema = new Schema(
  {
    section: { type: String, required: true }, // QA / VARC / DILR
    score: { type: Number, default: 0 },
    maxScore: { type: Number, default: 0 },
    percentile: { type: Number, default: 0 },
    attempted: { type: Number, default: 0 },
    correct: { type: Number, default: 0 },
    timeSpent: { type: Number, default: 0 }, // minutes
  },
  { _id: false }
);

const MockSchema = new Schema(
  {
    date: { type: String, required: true, index: true }, // YYYY-MM-DD
    name: { type: String, required: true },
    type: { type: String, default: "full" }, // full / sectional / topic
    series: { type: String, default: "" },
    overall: {
      score: { type: Number, default: 0 },
      maxScore: { type: Number, default: 204 },
      percentile: { type: Number, default: 0 },
      attempted: { type: Number, default: 0 },
      correct: { type: Number, default: 0 },
    },
    sections: { type: [MockSectionSchema], default: [] },
    takeaways: { type: String, default: "" },
    selectionNotes: { type: String, default: "" },
  },
  { timestamps: true }
);

export default (models.Mock as mongoose.Model<any>) || model("Mock", MockSchema);
