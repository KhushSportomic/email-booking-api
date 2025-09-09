// models/Booking.ts
import mongoose, { Schema, Document } from "mongoose";
import slotSchema from "./Slot"; // import sub-schema
import priceSchema from "./Price"; // import sub-schema

export interface IBooking extends Document {
  username: string;
  venueName: string;
  location?: string | null;
  bookingId: string;
  bookedDate?: string;
  bookedTime?: string;
  sport: string;
  court: string;
  slot: typeof slotSchema;
  price: typeof priceSchema;
  rawBody?: string;
}

const bookingSchema: Schema<IBooking> = new Schema({
  username: { type: String, required: true },
  venueName: { type: String, required: true },
  location: { type: String, default: null },
  bookingId: { type: String, required: true, unique: true },
  bookedDate: { type: String, required: false },
  bookedTime: { type: String, required: false },
  sport: { type: String, required: true },
  court: { type: String, required: true },
  slot: { type: slotSchema, required: true }, // embed Slot
  price: { type: priceSchema, required: true }, // embed Price
  rawBody: { type: String }, // optional, for debugging
});

export default mongoose.model<IBooking>("Booking", bookingSchema);
