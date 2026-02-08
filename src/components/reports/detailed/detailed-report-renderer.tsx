'use client';
import { DateRange } from 'react-day-picker';
import type { Customer, Expense, User, WithId } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ProfitLossReport } from './profit-loss-report';
import { CollectionDetailsReport } from './collection-details-report';
import { OverdueAccountsReport } from './overdue-accounts-report';
import { LoanLedgerReport } from './loan-ledger-report';
import { AgentCommissionReport } from './agent-commission-report';
import { NewCustomerReport } from './new-customer-report';


interface RendererProps {
    slug: string;
    customers: WithId<Customer>[];
    expenses: WithId<Expense>[];
    users: WithId<User>[];
    dateRange?: DateRange;
}

export function DetailedReportRenderer({ slug, customers, expenses, users, dateRange }: RendererProps) {

    const renderReport = () => {
        switch(slug) {
            case 'profit-and-loss':
                return <ProfitLossReport customers={customers} expenses={expenses} dateRange={dateRange} />;
            case 'collection-details':
                return <CollectionDetailsReport customers={customers} dateRange={dateRange} />;
            case 'overdue-accounts':
                return <OverdueAccountsReport customers={customers} />;
            case 'loan-ledger':
                return <LoanLedgerReport customers={customers} />;
            case 'agent-commission-statement':
                 return <AgentCommissionReport customers={customers} users={users} dateRange={dateRange} />;
            case 'new-customer-acquisition':
                return <NewCustomerReport customers={customers} dateRange={dateRange} />;
            default:
                return (
                    <Card>
                        <CardHeader><CardTitle>Report Not Found</CardTitle></CardHeader>
                        <CardContent><p>The selected report could not be found.</p></CardContent>
                    </Card>
                );
        }
    }

    return (
        <div>
            {renderReport()}
        </div>
    )
}
