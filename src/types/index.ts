

export type Agent = {
  uid: string;
  email: string;
  name: string;
}

export type User = Agent & {
  uid: string;
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
  customerId: string;
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
};

export type Expense = {
  expenseId: string;
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

export type WithId<T> = T & { id: string };
