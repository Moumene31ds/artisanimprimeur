export type PaymentStatus = 'succeeded' | 'failed' | 'pending' | 'processing' | 'refunded';

export interface Transaction {
  id: string;
  orderId: string;
  invoiceNumber?: string;
  provider: string;
  amount: number; // in cents
  currency: string;
  status: PaymentStatus;
  createdAt: string | Date | number;
  userId: string;
}
