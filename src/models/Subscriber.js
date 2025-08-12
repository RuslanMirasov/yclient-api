import mongoose, { Schema } from "mongoose";

function normalizePhone(raw = "") {
  let s = String(raw)
    .trim()
    .replace(/[^\d+]/g, "");
  if (s.startsWith("00")) s = "+" + s.slice(2);
  if (!s.startsWith("+")) s = "+" + s.replace(/[+]/g, "");
  return s;
}

const SubscriberSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    phone: {
      type: String,
      required: true,
      trim: true,
      set: normalizePhone,
      validate: {
        validator: (v) => /^\+\d{7,15}$/.test(v),
        message: "Invalid phone format",
      },
      unique: true, // один подписчик на номер
      index: true,
    },
    source: { type: String, default: "manual" },
    meta: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true, versionKey: false }
);

export default mongoose.models.Subscriber ||
  mongoose.model("Subscriber", SubscriberSchema);
