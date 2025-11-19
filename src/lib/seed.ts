
import { getFirestore, collection, writeBatch } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { v4 as uuidv4 } from 'uuid';
import { subMonths, formatISO } from 'date-fns';
import type { Company, User, Customer, Payment, Expense, ExpenseType } from '@/types';

// --- Hardcoded Demo Data ---

// Consistent Company ID
const FINSERV_COMPANY_ID = '9213b6c3-634c-4cf1-be66-8b79a73bc43b';

// Hardcoded User UIDs
const SUPER_ADMIN_UID = 'WkxEkKrs8fTm2dIsiYLz6OpAlx32';
const ADMIN_UID = 'Oj6wlYl66YgTGpM1YZtIAWy1CVl1';
const AGENT_UID = 'kriAJh27x3aZ5Pz2yI4tWxYg2Vb2';


const company: Company = {
    id: FINSERV_COMPANY_ID,
    name: 'FINSERV Demo Company',
    status: 'active',
    ownerUID: ADMIN_UID,
    createdAt: new Date().toISOString(),
};

const users: User[] = [
    {
        uid: SUPER_ADMIN_UID,
        name: 'Super Admin',
        email: 'superadmin@finserv.com',
        role: 'superadmin',
        companyId: '', // Superadmin does not belong to a company
    },
    {
        uid: ADMIN_UID,
        name: 'Admin User',
        email: 'admin@finserv.com',
        role: 'admin',
        companyId: FINSERV_COMPANY_ID,
    },
    {
        uid: AGENT_UID,
        name: 'Agent User',
        email: 'agent@finserv.com',
        role: 'agent',
        companyId: FINSERV_COMPANY_ID,
    }
];

const agentForCustomers = {
    uid: AGENT_UID,
    name: 'Agent User',
    email: 'agent@finserv.com',
};

const customers: Customer[] = [
    {
        customerId: 'cust_001',
        companyId: FINSERV_COMPANY_ID,
        name: 'Amit Sharma',
        phone: '9876543210',
        address: '123, MG Road, Bangalore',
        aadhar: '1111 2222 3333',
        phoneModel: 'iPhone 15 Pro',
        totalPrice: 130000,
        downPayment: 30000,
        financedAmount: 100000,
        interestAmount: 10000,
        totalPayable: 110000,
        duration: 10, // months
        monthlyEMI: 11000,
        startDate: formatISO(subMonths(new Date(), 4)),
        status: 'active',
        payments: [
            { paymentId: uuidv4(), date: formatISO(subMonths(new Date(), 3)), amount: 11000, mode: 'upi', remainingBalance: 99000 },
            { paymentId: uuidv4(), date: formatISO(subMonths(new Date(), 2)), amount: 11000, mode: 'upi', remainingBalance: 88000 },
            { paymentId: uuidv4(), date: formatISO(subMonths(new Date(), 1)), amount: 11000, mode: 'cash', remainingBalance: 77000 },
        ],
        agent: agentForCustomers
    },
    {
        customerId: 'cust_002',
        companyId: FINSERV_COMPANY_ID,
        name: 'Priya Singh',
        phone: '9988776655',
        address: '456, Koramangala, Bangalore',
        aadhar: '4444 5555 6666',
        phoneModel: 'Samsung Galaxy S24 Ultra',
        totalPrice: 125000,
        downPayment: 25000,
        financedAmount: 100000,
        interestAmount: 12000,
        totalPayable: 112000,
        duration: 8,
        monthlyEMI: 14000,
        startDate: formatISO(subMonths(new Date(), 2)),
        status: 'overdue',
        payments: [],
        agent: agentForCustomers
    },
    {
        customerId: 'cust_003',
        companyId: FINSERV_COMPANY_ID,
        name: 'Rajesh Kumar',
        phone: '9123456789',
        address: '789, Indiranagar, Bangalore',
        aadhar: '7777 8888 9999',
        phoneModel: 'Google Pixel 8 Pro',
        totalPrice: 95000,
        downPayment: 15000,
        financedAmount: 80000,
        interestAmount: 8000,
        totalPayable: 88000,
        duration: 11,
        monthlyEMI: 8000,
        startDate: formatISO(subMonths(new Date(), 12)),
        status: 'completed',
        payments: Array.from({ length: 11 }, (_, i) => ({
            paymentId: uuidv4(),
            date: formatISO(subMonths(new Date(), 11 - i)),
            amount: 8000,
            mode: 'cash',
            remainingBalance: 88000 - (8000 * (i + 1)),
        })),
        agent: agentForCustomers
    },
];

const expenseTypes: ExpenseType[] = [
    { id: 'et_001', name: 'Office Rent', createdAt: new Date().toISOString() },
    { id: 'et_002', name: 'Utilities', createdAt: new Date().toISOString() },
    { id: 'et_003', name: 'Salaries', createdAt: new Date().toISOString() },
    { id: 'et_004', name: 'Marketing', createdAt: new Date().toISOString() },
    { id: 'et_005', name: 'Miscellaneous', createdAt: new Date().toISOString() },
];

const expenses: Expense[] = [
    { 
        expenseId: 'exp_001', 
        companyId: FINSERV_COMPANY_ID, 
        date: formatISO(subMonths(new Date(), 1)),
        notes: 'Monthly office rent',
        amount: 50000,
        type: 'Office Rent',
        adminId: ADMIN_UID
    },
    { 
        expenseId: 'exp_002', 
        companyId: FINSERV_COMPANY_ID, 
        date: formatISO(new Date()),
        notes: 'Electricity bill',
        amount: 8000,
        type: 'Utilities',
        adminId: ADMIN_UID
    },
];

/**
 * Seeds the database with initial data.
 * This function is idempotent and will overwrite existing documents with the same ID.
 */
export async function seedDatabase() {
    const db = getFirestore();
    const auth = getAuth();
    
    console.log('Starting database seed process...');

    // 1. Create Auth users
    console.log('Creating authentication users...');
    for (const user of users) {
        try {
            await auth.createUser({
                uid: user.uid,
                email: user.email,
                password: 'Finserve@123', // Set a default password
                displayName: user.name,
            });
            console.log(`- Auth user created: ${user.email}`);
        } catch (error: any) {
            if (error.code === 'auth/uid-already-exists' || error.code === 'auth/email-already-exists') {
                console.log(`- Auth user already exists, updating: ${user.email}`);
                await auth.updateUser(user.uid, {
                    password: 'Finserve@123',
                    displayName: user.name,
                });
            } else {
                console.error(`Error creating auth user ${user.email}:`, error.message);
            }
        }
    }

    // Use a single batch for all Firestore writes
    const batch = db.batch();

    // 2. Set Company document
    console.log('Setting company document...');
    const companyRef = db.collection('companies').doc(company.id);
    batch.set(companyRef, company);

    // 3. Set User documents in Firestore
    console.log('Setting user documents in Firestore...');
    for (const user of users) {
        const { password, ...userData } = user; // Exclude password from Firestore doc
        const userRef = db.collection('users').doc(user.uid);
        batch.set(userRef, userData);
    }
    
    // 4. Set Customer documents
    console.log('Setting customer documents...');
    for (const customer of customers) {
        const customerRef = db.collection('customers').doc(customer.customerId);
        batch.set(customerRef, customer);
    }
    
    // 5. Set Expense Type documents
    console.log('Setting expense type documents...');
    for (const type of expenseTypes) {
        const typeRef = db.collection('expenseTypes').doc(type.id);
        batch.set(typeRef, type);
    }
    
    // 6. Set Expense documents
    console.log('Setting expense documents...');
    for (const expense of expenses) {
        const expenseRef = db.collection('expenses').doc(expense.expenseId);
        batch.set(expenseRef, expense);
    }

    // Commit the batch
    try {
        await batch.commit();
        console.log('\nDatabase seeded successfully!');
    } catch (error) {
        console.error('\nError committing batch:', error);
        throw new Error('Database seeding failed during batch commit.');
    }
}
