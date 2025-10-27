
"use client";

import type { Customer, WithId } from "@/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

const DetailItem = ({ label, value }: { label: string, value: React.ReactNode }) => (
    <div className="flex flex-col">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className="font-medium">{value}</span>
    </div>
);

const getStatusBadgeVariant = (status: Customer['status']) => {
  switch (status) {
    case 'active': return 'default';
    case 'completed': return 'secondary';
    case 'overdue': return 'destructive';
    default: return 'outline';
  }
};

export function CustomerDetails({ customer }: { customer: WithId<Customer> }) {
    const totalPaid = customer.payments?.reduce((acc, p) => acc + p.amount, 0) || 0;
    const remainingBalance = customer.totalPayable - totalPaid;

  return (
    <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline">Financing Summary</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <DetailItem label="Phone Model" value={customer.phoneModel} />
                    <DetailItem label="Total Price" value={`₹${customer.totalPrice.toLocaleString()}`} />
                    <DetailItem label="Down Payment" value={`₹${customer.downPayment.toLocaleString()}`} />
                    <DetailItem label="Financed Amount" value={`₹${customer.financedAmount.toLocaleString()}`} />
                    <DetailItem label="Interest" value={`₹${customer.interestAmount.toLocaleString()}`} />
                    <DetailItem label="Total Payable" value={`₹${customer.totalPayable.toLocaleString()}`} />
                    <DetailItem label="Monthly EMI" value={`₹${customer.monthlyEMI.toLocaleString()}`} />
                    <DetailItem label="Duration" value={`${customer.duration} months`} />
                    <DetailItem label="Start Date" value={format(new Date(customer.startDate), 'PPP')} />
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="font-headline">Payment History</CardTitle>
                    <CardDescription>
                        {customer.payments?.length || 0} of {customer.duration} EMIs paid.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Amount</TableHead>
                                <TableHead>Mode</TableHead>
                                <TableHead className="text-right">Remaining</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {customer.payments?.length > 0 ? customer.payments.map((p, index) => (
                                <TableRow key={index}>
                                    <TableCell>{format(new Date(p.date), 'PPP')}</TableCell>
                                    <TableCell>₹{p.amount.toLocaleString()}</TableCell>
                                    <TableCell className="capitalize">{p.mode}</TableCell>
                                    <TableCell className="text-right">₹{p.remainingBalance.toLocaleString()}</TableCell>
                                </TableRow>
                            )) : (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center">No payments recorded yet.</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>

        <div className="lg:col-span-1 space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline">Contact Info</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <DetailItem label="Phone Number" value={customer.phone} />
                    <DetailItem label="Aadhar Number" value={customer.aadhar} />
                    <DetailItem label="Address" value={customer.address} />
                    <DetailItem label="Status" value={
                        <Badge variant={getStatusBadgeVariant(customer.status)} className="capitalize text-sm">
                            {customer.status}
                        </Badge>}
                    />
                    <DetailItem label="Remaining Balance" value={
                        <span className="text-lg font-bold text-primary">₹{remainingBalance.toLocaleString()}</span>
                    } />
                </CardContent>
            </Card>
        </div>
    </div>
  );
}
