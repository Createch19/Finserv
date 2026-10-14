
export type Company = {
    id: string;
    name: string;
    status: 'active' | 'inactive' | 'setup_complete';
    ownerUID: string;
    createdAt: string; // ISO 8601 format
}

export type Agent = {
  uid: string;
  email: string;
  name: string;
}

export type User = Agent & {
  uid: string;
  role: 'admin' | 'agent' | 'superadmin';
  password?: string;
  companyId: string;
  isSuperAdmin?: boolean; // Keep for client-side convenience
};

export type Payment = {
  paymentId: string;
  date: string; // ISO 8601 format
  amount: number;
  mode: 'cash' | 'upi';
  remainingBalance: number;
};

export type Customer = {
  customerId: string;
  companyId: string;
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
  status: 'pending' | 'active' | 'completed' | 'overdue';
  payments: Payment[];
  agent: Agent;
  agentCommissionRate: number;
  commissionSettled: boolean;
};

export type Expense = {
  expenseId: string;
  companyId: string;
  date: string; // ISO 8601 format
  notes: string;
  amount: number;
  type: string;
  adminId: string;
};

export type ExpenseType = {
    id: string;
    name: string;
    createdAt: string;
}

export type WithdrawalRequest = {
  id: string;
  companyId: string;
  companyName: string;
  adminId: string;
  adminName: string;
  amount: number;
  status: 'pending' | 'approved' | 'rejected';
  notes: string;
  requestedAt: string; // ISO 8601 format
  processedAt?: string; // ISO 8601 format
  processedBy?: string; // Super Admin UID
};

export type AppSettings = {
    defaultInterestRate?: number;
    agentCommissionRate: number;
    whatsappPaymentTemplate?: string;
    whatsappReminderTemplate?: string;
    businessUpiId?: string;
}

export type WithId<T> = T & { id: string };
