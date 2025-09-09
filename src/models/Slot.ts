// models/Slot.ts
import { Schema } from "mongoose";

export interface ISlot {
  startTime: string;
  endTime: string;
  startDate: string;
  endDate: string;
}

const slotSchema: Schema<ISlot> = new Schema({
  startTime: { type: String, required: true },
  endTime: { type: String, required: true },
  startDate: { type: String, required: true },
  endDate: { type: String, required: true },
});

export default slotSchema; // export schema
