// models/Price.ts
import { Schema } from "mongoose";

export interface IPrice {
  totalAmount?: string;
  courtPrice?: string;
  convenienceFee?: string;
  discount?: string;
  advancePaid?: string;
  paidOnline?: string;
  payableAtVenue?: string;
}

const priceSchema: Schema<IPrice> = new Schema({
  totalAmount: { type: String, required: false },
  courtPrice: { type: String, required: false },
  convenienceFee: { type: String, required: false },
  discount: { type: String, required: false },
  advancePaid: { type: String, required: false },
  paidOnline: { type: String, required: false },
  payableAtVenue: { type: String, required: false },
});

export default priceSchema; // export schema
