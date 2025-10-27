# **App Name**: FINSERV

## Core Features:

- Authentication: Firebase Authentication with email/password and role-based access (admin, agent).
- Dashboard: Display key metrics such as total financed amount, collected amount, pending EMIs, and profit. Summary cards for total customers, active loans, due payments, and total profit.
- Customer Management: List, search, filter, add, and view customer details including payment status and history. Includes capturing Aadhar number and associated details.
- EMI Tracking: Track upcoming and overdue EMIs with color-coded status indicators (green, orange, red).
- Reporting: Generate charts and graphs for monthly collection trends, profit vs principal, and active vs completed loans.
- Settings Management: Manage agent users, update default interest rates, and backup/export customer data in CSV format.
- EMI Reminder Tool: Use AI to determine whether, when and how to send automated payment reminders for due EMIs (optional enhancement using Firebase Cloud Functions).

## Style Guidelines:

- Primary color: Deep cobalt blue (#1A73E8) to convey trust and financial stability.
- Background color: Light desaturated blue (#E8F0FE), providing a clean and calming backdrop.
- Accent color: Vivid violet (#8A3FFC) for highlighting key interactive elements and calls to action.
- Headline font: 'Poppins', a geometric sans-serif for a precise, contemporary feel.
- Body font: 'Inter', a grotesque-style sans-serif providing a modern, neutral, and readable text.
- Use crisp, minimalist icons to represent different financial functions and data points, maintaining a clean and modern aesthetic.
- Employ a mobile-first, responsive layout, ensuring optimal viewing experience across devices. Use cards and tables from shadcn/ui for a polished and consistent UI.