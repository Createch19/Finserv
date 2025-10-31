
"use client"

import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer, Pie, PieChart, Cell } from "recharts"
import { ChartTooltip, ChartTooltipContent, ChartContainer, ChartLegend, ChartLegendContent } from "@/components/ui/chart"
import type { Customer, Expense, WithId } from "@/types"
import { format, parseISO } from "date-fns"

// --- Monthly Collection Chart ---
export function CollectionChart({ customers, height = 250 }: { customers: WithId<Customer>[], height?: number }) {
  const monthlyCollectionData = (customers || [])
    .flatMap(c => c.payments || [])
    .reduce((acc, payment) => {
      const month = format(parseISO(payment.date), "MMM yyyy");
      acc[month] = (acc[month] || 0) + payment.amount;
      return acc;
    }, {} as Record<string, number>);

  const collectionChartData = Object.entries(monthlyCollectionData)
    .map(([month, total]) => ({ month, total }))
    .sort((a,b) => new Date(a.month).getTime() - new Date(b.month).getTime());

  return (
    <ChartContainer config={{ total: { label: "Collection", color: "hsl(var(--primary))" }}} className="h-[250px] w-full">
      <BarChart accessibilityLayer data={collectionChartData}>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="month"
          tickLine={false}
          tickMargin={10}
          axisLine={false}
          tickFormatter={(value) => value.slice(0, 3)}
        />
        <YAxis tickFormatter={(value) => `₹${Number(value) / 1000}k`} />
        <ChartTooltip
            cursor={false}
            content={<ChartTooltipContent formatter={(value) => `₹${(Number(value)).toLocaleString(undefined, {maximumFractionDigits: 0})}`} />}
         />
        <Bar dataKey="total" fill="var(--color-total)" radius={4} />
      </BarChart>
    </ChartContainer>
  )
}

// --- Profit Chart ---
export function ProfitChart({ customers, expenses, isAdmin, height = 200 }: { customers: WithId<Customer>[], expenses?: WithId<Expense>[], isAdmin?: boolean, height?: number }) {
    const totalInterest = (customers || []).reduce((acc, c) => acc + c.interestAmount, 0);
    const totalFinanced = (customers || []).reduce((acc, c) => acc + c.financedAmount, 0);
    const totalExpenses = isAdmin ? (expenses || []).reduce((acc, e) => acc + e.amount, 0) : 0;

    const profitChartData = [
        { name: 'Total Principal Financed', value: totalFinanced, fill: 'hsl(var(--chart-1))' },
        { name: 'Potential Interest (Profit)', value: totalInterest, fill: 'hsl(var(--chart-2))' },
    ];

    if (isAdmin) {
        profitChartData.push({ name: 'Total Expenses', value: totalExpenses, fill: 'hsl(var(--destructive))' });
    }

    return (
        <ChartContainer config={{}} className="h-[200px] w-full">
            <ResponsiveContainer width="100%" height="100%">
                 <BarChart layout="vertical" data={profitChartData}>
                    <CartesianGrid horizontal={false} />
                    <YAxis type="category" dataKey="name" tick={false} axisLine={false} />
                    <XAxis type="number" hide />
                    <ChartTooltip 
                        cursor={{fill: 'hsl(var(--muted))'}} 
                        content={<ChartTooltipContent formatter={(value) => `₹${(Number(value)).toLocaleString(undefined, {maximumFractionDigits: 0})}`}/>} 
                    />
                    <Bar dataKey="value" radius={5} />
                </BarChart>
            </ResponsiveContainer>
        </ChartContainer>
    )
}

// --- Loan Status Chart ---
export function LoanStatusChart({ customers, height = 200 }: { customers: WithId<Customer>[], height?: number }) {
    const loanStatusData = (customers || []).reduce((acc, customer) => {
        acc[customer.status] = (acc[customer.status] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    const loanStatusChartData = Object.entries(loanStatusData).map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value }));

    const COLORS = {
        'Active': 'hsl(var(--chart-1))',
        'Completed': 'hsl(var(--chart-2))',
        'Overdue': 'hsl(var(--destructive))',
    };

    const chartConfig = loanStatusChartData.reduce((acc, {name}) => {
        acc[name] = { label: name, color: COLORS[name as keyof typeof COLORS] };
        return acc;
    }, {} as any);
    
    return (
        <ChartContainer config={chartConfig} className="mx-auto aspect-square h-[200px]">
            <PieChart>
                 <ChartTooltip content={<ChartTooltipContent nameKey="value" hideLabel />} />
                <Pie data={loanStatusChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                     {loanStatusChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[entry.name as keyof typeof COLORS]} />
                    ))}
                </Pie>
                <ChartLegend content={<ChartLegendContent nameKey="name" />} />
            </PieChart>
        </ChartContainer>
    )
}

// --- Interest Rate Chart ---
export function InterestRateChart({ customers, height = 350 }: { customers: WithId<Customer>[], height?: number }) {
  const monthlyInterestRateData = (customers || [])
    .reduce((acc, customer) => {
      const month = format(parseISO(customer.startDate), "MMM yyyy");
      if (!acc[month]) {
        acc[month] = { totalInterestRate: 0, count: 0 };
      }
      const interestRate = (customer.interestAmount / customer.financedAmount) * 100;
      acc[month].totalInterestRate += interestRate;
      acc[month].count += 1;
      return acc;
    }, {} as Record<string, { totalInterestRate: number, count: number }>);

  const interestRateChartData = Object.entries(monthlyInterestRateData)
    .map(([month, { totalInterestRate, count }]) => ({
      month,
      averageRate: totalInterestRate / count,
    }))
    .sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime());

  return (
    <ChartContainer config={{ averageRate: { label: "Avg. Interest Rate", color: "hsl(var(--chart-2))" } }} className={`h-[${height}px] w-full`}>
      <BarChart accessibilityLayer data={interestRateChartData}>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="month"
          tickLine={false}
          tickMargin={10}
          axisLine={false}
          tickFormatter={(value) => value.slice(0, 3)}
        />
        <YAxis
          dataKey="averageRate"
          tickFormatter={(value) => `${value.toFixed(1)}%`}
        />
        <ChartTooltip
          cursor={false}
          content={<ChartTooltipContent formatter={(value) => `${Number(value).toFixed(2)}%`} />}
        />
        <Bar dataKey="averageRate" fill="var(--color-averageRate)" radius={4} />
      </BarChart>
    </ChartContainer>
  );
}
