/**
 * RSVP status state machine
 */
export type RSVPStatus = 
  | "none"           // No RSVP
  | "hold"           // Seat reserved for 10 minutes (awaiting payment)
  | "confirmed"      // Paid and confirmed
  | "waitlisted"     // On waitlist (capacity full)
  | "cancelled"      // User cancelled
  | "no_show";       // Checked in but didn't attend

/**
 * Payment status
 */
export type PaymentStatus = "unpaid" | "pending" | "paid";

/**
 * Attendance status for check-in
 */
export type AttendanceStatus = "none" | "checked_in" | "missing";

/**
 * Event registration model (RSVP)
 */
export interface EventRegistration {
  id: string;
  eventId: string;
  userId: string;
  rsvpStatus: RSVPStatus;
  paymentStatus: PaymentStatus;
  holdExpiresAt?: string; // ISO timestamp when HOLD expires
  attendanceStatus?: AttendanceStatus; // Check-in status: none, checked_in, missing
  questionnaireCompleted?: boolean; // true if user completed questionnaire for this event
  createdAt: string;
  updatedAt: string;
}

/**
 * Check-in status
 */
export type CheckInStatus = "not_checked_in" | "checked_in";

/**
 * Check-in record
 */
export interface CheckIn {
  id: string;
  eventId: string;
  userId: string;
  status: CheckInStatus;
  checkedInAt?: string; // ISO timestamp
  createdAt: string;
  updatedAt: string;
}

