import type { User, Customer, Payment } from '@/types';

export const adminUser: User = {
  uid: 'admin-001',
  email: 'admin@finserv.com',
  name: 'Admin User',
  role: 'admin',
};

export const agentUser: User = {
  uid: 'agent-001',
  email: 'agent@finserv.com',
  name: 'Agent Smith',
  role: 'agent',
};

const generatePayments = (totalPayable: number, monthlyEMI: number, startDate: string, paymentsMade: number): Payment[] => {
  const payments: Payment[] = [];
  let remainingBalance = totalPayable;
  const start = new Date(startDate);

  for (let i = 0; i < paymentsMade; i++) {
    remainingBalance -= monthlyEMI;
    const paymentDate = new Date(start);
    paymentDate.setMonth(start.getMonth() + i);
    payments.push({
      id: `payment-${i + 1}`,
      date: paymentDate.toISOString(),
      amount: monthlyEMI,
      mode: i % 2 === 0 ? 'upi' : 'cash',
      remainingBalance: remainingBalance,
    });
  }
  return payments;
};

export const customers: Customer[] = [
  {
    id: 'cust-001',
    name: 'Aarav Sharma',
    phone: '9876543210',
    address: '123 Tech Park, Bangalore',
    aadhar: '1234 5678 9012',
    phoneModel: 'iPhone 15 Pro',
    totalPrice: 130000,
    downPayment: 50000,
    financedAmount: 80000,
    interestAmount: 8000,
    totalPayable: 88000,
    duration: 8,
    monthlyEMI: 11000,
    startDate: '2024-01-15T00:00:00.000Z',
    status: 'active',
    agentId: 'agent-001',
    payments: generatePayments(88000, 11000, '2024-01-15T00:00:00.000Z', 5),
  },
  {
    id: 'cust-002',
    name: 'Priya Patel',
    phone: '8765432109',
    address: '456 Silicon Valley, Pune',
    aadhar: '2345 6789 0123',
    phoneModel: 'Samsung Galaxy S24 Ultra',
    totalPrice: 125000,
    downPayment: 45000,
    financedAmount: 80000,
    interestAmount: 10000,
    totalPayable: 90000,
    duration: 10,
    monthlyEMI: 9000,
    startDate: '2023-11-20T00:00:00.000Z',
    status: 'overdue',
    agentId: 'agent-001',
    payments: generatePayments(90000, 9000, '2023-11-20T00:00:00.000Z', 6), // Should have paid more by now
  },
  {
    id: 'cust-003',
    name: 'Rohan Singh',
    phone: '7654321098',
    address: '789 Cyber Hub, Gurgaon',
    aadhar: '3456 7890 1234',
    phoneModel: 'Google Pixel 8 Pro',
    totalPrice: 100000,
    downPayment: 30000,
    financedAmount: 70000,
    interestAmount: 7000,
    totalPayable: 77000,
    duration: 7,
    monthlyEMI: 11000,
    startDate: '2024-04-05T00:00:00.000Z',
    status: 'active',
    agentId: 'admin-001',
    payments: generatePayments(77000, 11000, '2024-04-05T00:00:00.000Z', 2),
  },
  {
    id: 'cust-004',
    name: 'Anika Gupta',
    phone: '6543210987',
    address: '101 IT City, Hyderabad',
    aadhar: '4567 8901 2345',
    phoneModel: 'OnePlus 12',
    totalPrice: 65000,
    downPayment: 25000,
    financedAmount: 40000,
    interestAmount: 4000,
    totalPayable: 44000,
    duration: 4,
    monthlyEMI: 11000,
    startDate: '2024-02-10T00:00:00.000Z',
    status: 'completed',
    agentId: 'agent-001',
    payments: generatePayments(44000, 11000, '2024-02-10T00:00:00.000Z', 4),
  },
  {
    id: 'cust-005',
    name: 'Vikram Reddy',
    phone: '9988776655',
    address: '222 Financial District, Mumbai',
    aadhar: '5678 9012 3456',
    phoneModel: 'Xiaomi 14 Ultra',
    totalPrice: 99000,
    downPayment: 49000,
    financedAmount: 50000,
    interestAmount: 5000,
    totalPayable: 55000,
    duration: 5,
    monthlyEMI: 11000,
    startDate: '2024-05-01T00:00:00.000Z',
    status: 'active',
    agentId: 'admin-001',
    payments: [], // New customer
  },
];
