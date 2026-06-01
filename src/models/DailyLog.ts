import mongoose, { Schema, model, models } from "mongoose";

const PracticeSchema = new Schema(
  { attempted: { type: Number, default: 0 }, correct: { type: Number, default: 0 } },
  { _id: false }
);

const ExtraWorkSchema = new Schema(
  {
    description: { type: String, default: "" },
    category: { type: String, default: "QA" }, // QA / RC / VA / DI / LR / Other — same areas as planned practice
    topic: { type: String, default: "" },
    minutes: { type: Number, default: 0 },
    attempted: { type: Number, default: 0 }, // questions or sets done
    correct: { type: Number, default: 0 },
  },
  { _id: true }
);

const TopicSchema = new Schema(
  {
    block: { type: String, default: "" }, // which daily block it was studied under
    section: { type: String, default: "Other" }, // QA / VARC / DI / LR / ... (for cross-day tracking)
    name: { type: String, required: true }, // the actual topic, e.g. "Time-Speed-Distance"
  },
  { _id: false }
);

const DailyLogSchema = new Schema(
  {
    date: { type: String, required: true, unique: true, index: true }, // YYYY-MM-DD
    phase: { type: String, default: "P1" },
    hoursActual: { type: Number, default: 0 },
    // practice volume by tag
    practice: {
      QA: { type: PracticeSchema, default: () => ({}) },
      RC: { type: PracticeSchema, default: () => ({}) },
      VA: { type: PracticeSchema, default: () => ({}) },
      DI: { type: PracticeSchema, default: () => ({}) },
      LR: { type: PracticeSchema, default: () => ({}) },
    },
    rcPassages: { type: Number, default: 0 },
    vaDrills: { type: Number, default: 0 },
    lr: {
      setsDone: { type: Number, default: 0 },
      avgTimePerSet: { type: Number, default: 0 }, // minutes
      accuracy: { type: Number, default: 0 }, // %
    },
    errorsLogged: { type: Number, default: 0 },
    errorsRevised: { type: Number, default: 0 },
    pomodoros: { type: Number, default: 0 }, // completed focus sessions
    focusMinutes: { type: Number, default: 0 }, // total focused minutes from the timer
    energy: { type: Number, default: 3 }, // 1-5
    sleepHours: { type: Number, default: 0 },
    blocksDone: { type: [String], default: [] }, // names of planned blocks completed
    extraWork: { type: [ExtraWorkSchema], default: [] },
    topics: { type: [TopicSchema], default: [] },
    notes: { type: String, default: "" },
  },
  { timestamps: true }
);

export default (models.DailyLog as mongoose.Model<any>) || model("DailyLog", DailyLogSchema);
