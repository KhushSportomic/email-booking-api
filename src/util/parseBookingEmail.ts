// utils/parseBookingEmail.ts

export interface ParseResult {
  isBooking: boolean;
  company?: string | null;
  username?: string | null;
  bookingId?: string | null;
  venue?: string | null;
  location?: string | null;
  court?: string | null;
  sport?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  bookedDate?: string | null;
  bookedTime?: string | null;
  totalAmount?: string | null;
  courtPrice?: string | null;
  convenienceFee?: string | null;
  discount?: string | null;
  advancePaid?: string | null;
  paidOnline?: string | null;
  payableAtVenue?: string | null;
  rawBody: string;
}

function parseBookingEmail(body: string): ParseResult {
  let company: string | null = null;
  if (body.includes("playo")) {
    company = "Playo";
  } else if (body.includes("Hudle")) {
    company = "Hudel";
  } else {
    console.log("Not a Playo or Hudel email");
  }

  console.log(`📧 Detected company: ${company}`);

  if (!company) {
    return { isBooking: false, rawBody: body };
  }

  if (company === "Playo") {
    const hasbooking = body.includes("Your Booking for");

    const username = hasbooking
      ? body.match(/Hey\s+([A-Za-z]+)/)?.[1] || null
      : null;

    const sport = body.match(/Sport:\s*\*?([A-Za-z]+)\*?/)?.[1] || null;

    const normalized = body
      .replace(/\r?\n|\r/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    let venue: string | null = null;
    let location: string | null = null;

    const bookingPhraseMatch = normalized.match(
      /Your Booking for\s+(.+?)\s+has been confirmed/i
    );

    if (bookingPhraseMatch) {
      const fullText = bookingPhraseMatch[1].replace(/<[^>]*>/g, "").trim();
      const atParts = fullText.split(/\s+at\s+/i);
      if (atParts.length > 1) {
        const afterAt = atParts[1].trim();
        const parts = afterAt.split(",");
        venue = parts[0]?.trim() || null;
        location = parts.slice(1).join(",").trim() || null;
      }
    }

    const bookingId = body.match(/Booking ID:\s*\*([A-Z0-9]+)\*/)?.[1] || null;
    const court = body.match(/Court:\s*\*(.+?)\*/)?.[1] || null;

    const slot = body.match(/Slot:\s*\*(.+?)\*/)?.[1] || null;
    let startTime: string | null = null,
      endTime: string | null = null;
    if (slot) {
      const timeParts = slot.match(
        /(\d{1,2}:\d{2}\s?[APMapm]+)-(\d{1,2}:\d{2}\s?[APMapm]+)/
      );
      if (timeParts) {
        startTime = timeParts[1].trim();
        endTime = timeParts[2].trim();
      }
    }

    const bookedOnMatch = body.match(
      /Booked on\s*(.+?),\s*([0-9: ]+[APMapm]+)/
    );
    let startDate: string | null = null,
      endDate: string | null = null,
      bookedDate: string | null = null,
      bookedTime: string | null = null;
    if (bookedOnMatch) {
      bookedDate = bookedOnMatch[1].trim();
      bookedTime = bookedOnMatch[2].trim();
      const parsedDate = new Date(bookedDate);
      if (!isNaN(parsedDate.getTime())) {
        startDate = parsedDate.toISOString().split("T")[0];
        endDate = startDate;
      }
    }

    const totalAmount =
      body.match(/Total Amount Paid ₹\s*([0-9.]+)/)?.[1] || null;
    const courtPrice = body.match(/Court Price:\s*₹\s*([0-9.]+)/)?.[1] || null;
    const convenienceFee =
      body.match(/Convenience Fee:\s*₹\s*([0-9.]+)/)?.[1] || null;
    const discount =
      body.match(/Discount \/ Karma availed:\s*- ₹\s*([0-9.]+)/)?.[1] || null;
    const advancePaid =
      body.match(/Advance Paid:\s*₹\s*([0-9.]+)/)?.[1] || null;
    const paidOnline = body.match(/Paid Online:\s*₹\s*([0-9.]+)/)?.[1] || null;
    const payableAtVenue =
      body.match(/Payable at the venue:\s*₹\s*([0-9.]+)/)?.[1] || null;

    return {
      isBooking: hasbooking,
      company,
      username,
      venue,
      location,
      bookingId,
      sport,
      court,
      startTime,
      endTime,
      startDate,
      endDate,
      totalAmount,
      courtPrice,
      convenienceFee,
      discount,
      advancePaid,
      paidOnline,
      payableAtVenue,
      bookedDate,
      bookedTime,
      rawBody: body,
    };
  }

  if (company === "Hudel") {
    console.log("📧 Parsing Hudle email...");

    const username = body.match(/\*Name\*:\s*(.+)/)?.[1]?.trim() || null;
    const bookingId =
      body.match(/\*Booking ID\*:\s*#?([A-Z0-9]+)/)?.[1] || null;
    const venue =
      body.match(/\*Venue Name & Address\*:\s*(.+)/)?.[1]?.trim() || null;
    const court = body.match(/\*Facility\*:\s*(.+)/)?.[1]?.trim() || null;
    const sport = body.match(/\*Sport\*:\s*(.+)/)?.[1]?.trim() || null;

    let startTime: string | null = null,
      endTime: string | null = null,
      startDate: string | null = null,
      endDate: string | null = null;
    const slotMatch = body.match(
      /(\w{3},\s\w{3}\s\d{1,2},\s\d{4})\s(\d{1,2}:\d{2}\s[APMapm]+)\s-\s\w{3},\s\w{3}\s\d{1,2},\s\d{4}\s(\d{1,2}:\d{2}\s[APMapm]+)/
    );
    if (slotMatch) {
      startDate = new Date(slotMatch[1]).toISOString().split("T")[0];
      startTime = slotMatch[2];
      endTime = slotMatch[3];
      endDate = startDate;
    }

    return {
      isBooking: true,
      company,
      username,
      bookingId,
      venue,
      court,
      sport,
      startDate,
      endDate,
      startTime,
      endTime,
      bookedDate: startDate,
      bookedTime: startTime,
      totalAmount: null,
      courtPrice: null,
      convenienceFee: null,
      discount: null,
      advancePaid: null,
      paidOnline: null,
      payableAtVenue: null,
      rawBody: body,
    };
  }

  return { isBooking: false, rawBody: body };
}

export default parseBookingEmail;
