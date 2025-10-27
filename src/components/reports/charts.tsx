"use client"

import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer, Pie, PieChart, Cell } from "recharts"
import { ChartTooltip, ChartTooltipContent, ChartContainer, ChartLegend, ChartLegendContent } from "@/components/ui/chart"
import { customers } from "@/lib/demo-data"
import { format, parseISO } from "date-fns"

// --- Monthly Collection Data ---
const monthlyCollectionData = customers
  .flatMap(c => c.payments)
  .reduce((acc, payment) => {
    const month = format(parseISO(payment.date), "MMM yyyy");
    acc[month] = (acc[month] || 0) + payment.amount;
    return acc;
  }, {} as Record<string, number>);

const collectionChartData = Object.entries(monthlyCollectionData)
  .map(([month, total]) => ({ month, total }))
  .sort((a,b) => new Date(a.month).getTime() - new Date(b.month).getTime());

export function CollectionChart({ height = 250 }: { height?: number }) {
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
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey="total" fill="var(--color-total)" radius={4} />
      </BarChart>
    </ChartContainer>
  )
}

// --- Profit Chart Data ---
const totalInterest = customers.reduce((acc, c) => acc + c.interestAmount, 0);
const totalFinanced = customers.reduce((acc, c) => acc + c.financedAmount, 0);
const profitChartData = [
    { name: 'Total Principal Financed', value: totalFinanced, fill: 'hsl(var(--chart-1))' },
    { name: 'Potential Interest (Profit)', value: totalInterest, fill: 'hsl(var(--chart-2))' },
]

export function ProfitChart({ height = 200 }: { height?: number }) {
    return (
        <ChartContainer config={{}} className="h-[200px] w-full">
            <ResponsiveContainer width="100%" height="100%">
                 <BarChart layout="vertical" data={profitChartData}>
                    <CartesianGrid horizontal={false} />
                    <YAxis type="category" dataKey="name" tick={false} axisLine={false} />
                    <XAxis type="number" hide />
                    <ChartTooltip cursor={{fill: 'hsl(var(--muted))'}} content={<ChartTooltipContent />} />
                    <Bar dataKey="value" radius={5} />
                </BarChart>
            </ResponsiveContainer>
        </ChartContainer>
    )
}

// --- Loan Status Data ---
const loanStatusData = customers.reduce((acc, customer) => {
    acc[customer.status] = (acc[customer.status] || 0) + 1;
    return acc;
}, {} as Record<string, number>);

const loanStatusChartData = Object.entries(loanStatusData).map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value }));

const COLORS = {
    'Active': 'hsl(var(--chart-1))',
    'Completed': 'hsl(var(--chart-2))',
    'Overdue': 'hsl(var(--destructive))',
};

export function LoanStatusChart({ height = 200 }: { height?: number }) {
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

