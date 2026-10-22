export type TableSection = 
  | 'Main Dining Hall'
  | 'Romantic Window Booth'
  | 'VIP Private Suite'
  | 'Garden Terrace'
  | 'Chef\'s Counter';

export type TableStatus = 'available' | 'reserved' | 'occupied' | 'maintenance';

export interface RestaurantTable {
  id: string;
  name: string;
  section: TableSection;
  capacity: number;
  minSpend: number;
  depositFee: number;
  status: TableStatus;
  description: string;
  features: string[];
  imageUrl: string;
  // Floor plan layout coordinates (percentage 0-100)
  x: number;
  y: number;
  shape?: 'round' | 'rect' | 'booth';
}

export type OccasionType = 
  | 'Casual Dining'
  | 'Romantic Dinner'
  | 'Birthday Celebration'
  | 'Wedding Anniversary'
  | 'Business Dining'
  | 'Family Gathering';

export type PaymentMethod = 
  | 'qris'
  | 'gopay'
  | 'ovo'
  | 'dana'
  | 'shopeepay'
  | 'bca_va'
  | 'mandiri_va'
  | 'bni_va'
  | 'bri_va'
  | 'credit_card';

export type ReservationStatus = 
  | 'pending_payment'
  | 'confirmed'
  | 'arrived'
  | 'seated'
  | 'completed'
  | 'cancelled';

export type PaymentStatus = 'pending' | 'paid' | 'refunded';

export interface Reservation {
  id: string;
  userId?: string;
  bookingCode: string; // e.g. "SAV-8421"
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  guestsCount: number;
  tableId: string;
  tableName: string;
  tableSection: TableSection;
  date: string; // YYYY-MM-DD
  timeSlot: string; // e.g. "19:00"
  occasion: OccasionType;
  specialNotes?: string;
  dietaryRequests?: string;
  depositAmount: number;
  pointsEarned?: number;
  pointsRedeemed?: number;
  pointsDiscountAmount?: number;
  paymentStatus: PaymentStatus;
  paymentMethod?: PaymentMethod;
  paymentReference?: string;
  status: ReservationStatus;
  createdAt: string;
  updatedAt: string;
}

export type NotificationType = 
  | 'reservation_created'
  | 'payment_confirmed'
  | 'status_changed'
  | 'table_ready'
  | 'reminder'
  | 'general';

export interface RestaurantNotification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  recipientEmail?: string;
  reservationId?: string;
  isRead: boolean;
  createdAt: string;
}

export interface PaymentSimulationDetails {
  method: PaymentMethod;
  amount: number;
  reservationId: string;
  customerName: string;
  qrCodeUrl?: string;
  virtualAccountNumber?: string;
  paymentDeadline: string;
}

export interface CustomerReview {
  id: string;
  reservationId?: string;
  customerName: string;
  rating: number; // 1 to 5
  reviewText?: string;
  tags?: string[];
  postedToGoogle?: boolean;
  createdAt: string;
}

export type LoyaltyTier = 'Bronze' | 'Silver' | 'Gold' | 'Platinum';

export interface LoyaltyHistoryItem {
  id: string;
  date: string;
  description: string;
  points: number; // positive for earned, negative for redeemed
  type: 'earned' | 'redeemed' | 'bonus' | 'tier_welcome';
  reservationId?: string;
  bookingCode?: string;
}

export interface LoyaltyAccount {
  id: string;
  customerPhone: string;
  customerEmail: string;
  customerName: string;
  pointsBalance: number;
  tier: LoyaltyTier;
  totalEarned: number;
  totalRedeemed: number;
  history: LoyaltyHistoryItem[];
  joinedAt: string;
  updatedAt: string;
}

export type WaitlistStatus = 'waiting' | 'called' | 'seated' | 'cancelled';

export interface WaitlistEntry {
  id: string;
  queueNumber: number;
  queueCode: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  guestCount: number;
  preferredSection: 'indoor' | 'outdoor' | 'vip' | 'any';
  preferredTimeSlot: string;
  date: string;
  specialRequests?: string;
  status: WaitlistStatus;
  estimatedWaitMinutes: number;
  joinedAt: string;
  calledAt?: string;
  seatedAt?: string;
  assignedTableId?: string;
  assignedTableName?: string;
  loyaltyTier?: LoyaltyTier;
}

export type UserRole = 'customer' | 'staff' | 'admin';

export type ChatSenderRole = 'customer' | 'staff';

export interface WaitlistChatMessage {
  id: string;
  waitlistEntryId: string;
  queueCode: string;
  senderRole: ChatSenderRole;
  senderName: string;
  text: string;
  createdAt: string;
  isRead: boolean;
  quickTemplateId?: string;
}

export interface WaitlistQuickTemplate {
  id: string;
  label: string;
  message: string;
  category: 'status' | 'request' | 'arrival';
}

export * from './settings';
