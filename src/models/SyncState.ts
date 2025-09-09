// models/SyncState.ts
import mongoose, { Schema, Document, Model } from "mongoose";

export interface ITokens {
  expiryDate: string | undefined;
  access_token?: string;
  refresh_token?: string;
}

export interface ISyncState extends Document {
  _id: string;
  lastHistoryId?: string;
  tokens?: ITokens;
}

const syncStateSchema: Schema<ISyncState> = new mongoose.Schema({
  _id: { type: String, default: "gmail-sync-state" },
  lastHistoryId: String,
  tokens: {
    access_token: String,
    refresh_token: String,
  },
});

// ✅ This checks if model already exists to prevent OverwriteModelError
const SyncState: Model<ISyncState> =
  mongoose.models.SyncState ||
  mongoose.model<ISyncState>("SyncState", syncStateSchema);

export default SyncState;
