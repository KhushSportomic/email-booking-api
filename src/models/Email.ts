// models/Email.ts
import mongoose, { Schema, Document, Model } from "mongoose";

export interface IEmail extends Document {
  messageId: string;
  historyId?: string;
  from?: string;
  subject?: string;
  body?: string;
  accessTokenUsed?: string;
  fetchedAt: Date;
}

const emailSchema: Schema<IEmail> = new mongoose.Schema({
  messageId: { type: String, unique: true, required: true },
  historyId: String,
  from: String,
  subject: String,
  body: String,
  accessTokenUsed: String,
  fetchedAt: { type: Date, default: Date.now },
});

const Email: Model<IEmail> =
  mongoose.models.Email || mongoose.model<IEmail>("Email", emailSchema);

export default Email;
