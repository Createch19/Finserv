# FINSERV - Local Finance Manager

FINSERV is a modern, mobile-responsive web application designed for managing local mobile financing businesses. It provides a robust multi-tenant architecture with specialized workflows for administrators and collection agents.

## 🚀 Key Features

### 🏢 Multi-Tenant Management
- **Super Admin Dashboard**: Global oversight of all registered companies, users, and withdrawal approvals.
- **Company Management**: Ability to create and manage independent tenant companies.

### 👥 Role-Based Access Control (RBAC)
- **Super Admin**: Complete system access.
- **Company Admin**: Manage their own company's team (Admins/Agents), customers, expenses, and commissions.
- **Agent / Collector**: Operational access to customers, EMI tracking, and payment recording.

### 💰 Financing & Collections
- **Full Loan Lifecycle**: Manage pending files, active loans, and completed records.
- **Dynamic EMI Tracker**: Automatic calculation of installments, due dates, and arrears.
- **Smart Collections**: FIFO-based payment recording that settles historical arrears first.
- **Capital Flow Tracking**: Monitor how collected cash is reinvested into new loans.

### 📱 Integrated WhatsApp Engine
- **Direct Messaging**: One-click WhatsApp Web integration to open direct chats with customers.
- **Dynamic Templates**: Customizable receipt and reminder formats manageable via Settings.
- **Smart Placeholders**: Automatic injection of customer names, amounts, balances, and UPI payment links.

### 🤖 AI-Powered Reminders
- **Intelligent EMI Reminders**: Uses Genkit AI to determine the best timing and tone for payment reminders based on customer history.

### 📊 Comprehensive Reporting
- **Profit & Loss (P&L)**: Real-time revenue vs. cost analysis.
- **Collection Trends**: Visual and detailed reports of monthly targets vs. actual cash flow.
- **Overdue Audit**: Actionable lists of accounts requiring immediate attention.
- **Agent Commissions**: Automated calculation and settlement tracking for sales staff.

## 🛠 Tech Stack
- **Frontend**: Next.js 15 (App Router), React, Tailwind CSS.
- **UI Components**: shadcn/ui (Radix UI), Lucide Icons.
- **Backend/Database**: Firebase Firestore, Firebase Authentication.
- **AI**: Genkit (Google Gemini 2.5 Flash).
- **Language**: TypeScript.

## 🔒 Security
- **Firestore Security Rules**: Strict server-side enforcement of tenant isolation and role-based permissions.
- **Admin SDK**: Secure server-side user creation and custom claims management.

## 📈 Database Seed
To populate the application with professional demo data, navigate to **Settings > Data** and click **Trigger Database Seed**.

---
*Built with ❤️ using Firebase Studio*