

export type User = {
  uid: string;
  email: string;
  name: string;
  role: 'admin' | 'agent';
  password?: string;
};

export type Payment = {
  paymentId: string;
  date: string; // ISO 8601 format
  amount: number;
  mode: 'cash' | 'upi';
  remainingBalance: number;
};

export type Customer = {
  name: string;
  phone: string;
  address: string;
  aadhar: string;
  phoneModel: string;
  totalPrice: number;
  downPayment: number;
  financedAmount: number;
  interestAmount: number;
  totalPayable: number;
  duration: number; // in months
  monthlyEMI: number;
  startDate: string; // ISO 8601 format
  status: 'active' | 'completed' | 'overdue';
  payments: Payment[];
};

export type WithId<T> = T & { id: string };
