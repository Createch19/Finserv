'use client';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { FileText, ArrowRight } from "lucide-react";
import Link from "next/link";

const reportCategories = [
  {
    title: "Financial Reports",
    reports: [
      {
        slug: "profit-and-loss",
        title: "Profit & Loss (P&L) Report",
        description: "View revenue, costs, and net profit over a selected period.",
      },
      {
        slug: "collection-details",
        title: "Detailed Collection Report",
        description: "A line-by-line list of all EMI payments received.",
      },
    ],
  },
  {
    title: "Portfolio Health Reports",
    reports: [
        {
            slug: "overdue-accounts",
            title: "Overdue Accounts Report",
            description: "An actionable list of all customers with overdue payments.",
        },
        {
            slug: "loan-ledger",
            title: "Full Loan Ledger",
            description: "View and filter all loans in the system by status and date.",
        },
    ]
  },
  {
      title: "Agent & Growth Reports",
      reports: [
          {
            slug: "agent-commission-statement",
            title: "Agent Commission Statement",
            description: "Detailed breakdown of commissions earned by each agent.",
          },
          {
            slug: "new-customer-acquisition",
            title: "New Customer Acquisition Report",
            description: "Track new customers acquired within a specific timeframe.",
          }
      ]
  }
];

export function DetailedReportList() {
    return (
        <Accordion type="multiple" className="w-full space-y-4">
            {reportCategories.map((category) => (
                <AccordionItem value={category.title} key={category.title} className="border rounded-lg">
                    <AccordionTrigger className="p-6 hover:no-underline">
                        <h3 className="text-lg font-semibold">{category.title}</h3>
                    </AccordionTrigger>
                    <AccordionContent className="p-6 pt-0">
                       <div className="space-y-4">
                         {category.reports.map((report) => (
                            <div key={report.slug} className="flex items-center justify-between p-4 rounded-md border bg-background hover:bg-muted/50">
                                <div className="flex items-start gap-4">
                                    <FileText className="h-6 w-6 text-primary mt-1" />
                                    <div>
                                        <h4 className="font-medium">{report.title}</h4>
                                        <p className="text-sm text-muted-foreground">{report.description}</p>
                                    </div>
                                </div>
                                <Link href={`/reports/${report.slug}`} passHref>
                                    <Button variant="outline" size="sm">
                                        View Report <ArrowRight className="ml-2 h-4 w-4" />
                                    </Button>
                                </Link>
                            </div>
                         ))}
                       </div>
                    </AccordionContent>
                </AccordionItem>
            ))}
        </Accordion>
    )
}
