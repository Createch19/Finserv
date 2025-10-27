import { PageHeader } from "@/components/page-header";
import { CollectionChart, ProfitChart, LoanStatusChart } from "@/components/reports/charts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function ReportsPage() {
  return (
    <>
      <PageHeader
        title="Reports"
        description="Visualize your business performance with insightful charts."
      />
      <div className="grid gap-6">
        <Card>
            <CardHeader>
                <CardTitle>Monthly Collection Trend</CardTitle>
                <CardDescription>Total EMI amount collected each month.</CardDescription>
            </CardHeader>
            <CardContent>
                <CollectionChart height={350} />
            </CardContent>
        </Card>
         <div className="grid md:grid-cols-2 gap-6">
            <Card>
                <CardHeader>
                    <CardTitle>Profit vs Principal</CardTitle>
                    <CardDescription>Comparison of interest earned against the principal amount collected.</CardDescription>
                </CardHeader>
                <CardContent>
                    <ProfitChart height={300} />
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle>Loan Status</CardTitle>
                    <CardDescription>Distribution of active, completed, and overdue loans.</CardDescription>
                </CardHeader>
                <CardContent>
                    <LoanStatusChart height={300} />
                </CardContent>
            </Card>
         </div>
      </div>
    </>
  );
}
