

"use client"

import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer, Pie, PieChart, Cell, Line, LineChart, Label } from "recharts"
import { ChartTooltip, ChartTooltipContent, ChartContainer, ChartLegend, ChartLegendContent } from "@/components/ui/chart"
import type { Customer, Expense, WithId } from "@/types"
import { format, parseISO, addMonths, eachMonthOfInterval, startOfMonth, endOfMonth, isBefore } from "date-fns"

// --- Monthly Collection Chart ---
export function CollectionChart({ customers, height = 250 }: { customers: WithId<Customer>[], height?: number }) {
  const monthlyData = (customers || []).reduce((acc, customer) => {
    const startDate = parseISO(customer.startDate);
    const endDate = addMonths(startDate, customer.duration);

    // Calculate expected collections
    const loanMonths = eachMonthOfInterval({ start: startDate, end: endDate });
    loanMonths.forEach((monthDate, index) => {
      // The first month in the interval is the start date's month, but the first EMI is due after one month.
      if (index > 0) { 
        const monthKey = format(monthDate, "MMM yyyy");
        acc[monthKey] = acc[monthKey] || { expected: 0, actual: 0 };
        acc[monthKey].expected += customer.monthlyEMI;
      }
    });

    // Calculate actual collections
    (customer.payments || []).forEach(payment => {
      const monthKey = format(parseISO(payment.date), "MMM yyyy");
      acc[monthKey] = acc[monthKey] || { expected: 0, actual: 0 };
      acc[monthKey].actual += payment.amount;
    });

    return acc;
  }, {} as Record<string, { expected: number; actual: number }>);

  const collectionChartData = Object.entries(monthlyData)
    .map(([month, totals]) => ({ month, ...totals }))
    .sort((a,b) => new Date(a.month).getTime() - new Date(b.month).getTime())
    // Only show months that have occurred or are in progress
    .filter(d => isBefore(new Date(d.month), endOfMonth(new Date())));


  const chartConfig = {
    actual: { label: "Actual", color: "hsl(var(--chart-1))" },
    expected: { label: "Expected", color: "hsl(var(--chart-2))" },
  };

  return (
    <ChartContainer config={chartConfig} className={`h-[250px] md:h-[${height}px] w-full`}>
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
        <ChartLegend />
        <Bar dataKey="actual" fill="var(--color-actual)" radius={4} />
        <Bar dataKey="expected" fill="var(--color-expected)" radius={4} />
      </BarChart>
    </ChartContainer>
  )
}

// --- Monthly Collection Count Chart ---
export function CollectionCountChart({ customers, height = 250 }: { customers: WithId<Customer>[], height?: number }) {
  const monthlyData = (customers || []).reduce((acc, customer) => {
    const startDate = parseISO(customer.startDate);
    const endDate = addMonths(startDate, customer.duration);

    // Calculate expected collection counts
    const loanMonths = eachMonthOfInterval({ start: startDate, end: endDate });
    loanMonths.forEach((monthDate, index) => {
      if (index > 0) {
        const monthKey = format(monthDate, "MMM yyyy");
        acc[monthKey] = acc[monthKey] || { expected: 0, actual: 0 };
        acc[monthKey].expected += 1;
      }
    });

    // Calculate actual collection counts
    (customer.payments || []).forEach(payment => {
      const monthKey = format(parseISO(payment.date), "MMM yyyy");
      acc[monthKey] = acc[monthKey] || { expected: 0, actual: 0 };
      acc[monthKey].actual += 1;
    });

    return acc;
  }, {} as Record<string, { expected: number; actual: number }>);

  const collectionChartData = Object.entries(monthlyData)
    .map(([month, totals]) => ({ month, ...totals }))
    .sort((a,b) => new Date(a.month).getTime() - new Date(b.month).getTime())
    .filter(d => isBefore(new Date(d.month), endOfMonth(new Date())));

  const chartConfig = {
    actual: { label: "Actual Count", color: "hsl(var(--chart-1))" },
    expected: { label: "Expected Count", color: "hsl(var(--chart-2))" },
  };

  return (
    <ChartContainer config={chartConfig} className={`h-[250px] md:h-[${height}px] w-full`}>
      <BarChart accessibilityLayer data={collectionChartData}>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="month"
          tickLine={false}
          tickMargin={10}
          axisLine={false}
          tickFormatter={(value) => value.slice(0, 3)}
        />
        <YAxis tickFormatter={(value) => String(value)} />
        <ChartTooltip
            cursor={false}
            content={<ChartTooltipContent formatter={(value, name) => `${value} EMIs`} />}
         />
        <ChartLegend />
        <Bar dataKey="actual" fill="var(--color-actual)" radius={4} />
        <Bar dataKey="expected" fill="var(--color-expected)" radius={4} />
      </BarChart>
    </ChartContainer>
  )
}


// --- Profit Chart ---
export function ProfitChart({ customers, expenses, isAdmin, height = 300 }: { customers: WithId<Customer>[], expenses?: WithId<Expense>[], isAdmin?: boolean, height?: number }) {
    const totalInterest = (customers || []).reduce((acc, c) => acc + c.interestAmount, 0);
    const totalFinanced = (customers || []).reduce((acc, c) => acc + c.financedAmount, 0);
    const totalExpenses = (expenses || []).reduce((acc, e) => acc + e.amount, 0);

    const profitChartData = [
        {
            name: "Financials",
            principal: totalFinanced,
            interest: totalInterest,
            expenses: isAdmin ? totalExpenses : 0,
        }
    ];

    const chartConfig = {
        principal: { label: 'Principal', color: 'hsl(var(--chart-1))' },
        interest: { label: 'Interest', color: 'hsl(var(--chart-2))' },
        expenses: { label: 'Expenses', color: 'hsl(var(--destructive))' },
    };

    return (
       <ChartContainer config={chartConfig} className={`h-[${height}px] w-full`}>
            <BarChart accessibilityLayer data={profitChartData} layout="vertical">
                <CartesianGrid horizontal={false} />
                <YAxis dataKey="name" type="category" tickLine={false} axisLine={false} hide />
                <XAxis type="number" tickFormatter={(value) => `₹${Number(value) / 1000}k`} />
                <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent formatter={(value) => `₹${(Number(value)).toLocaleString()}`} />}
                />
                <ChartLegend />
                <Bar dataKey="principal" fill="var(--color-principal)" radius={4} />
                <Bar dataKey="interest" fill="var(--color-interest)" radius={4} />
                {isAdmin && <Bar dataKey="expenses" fill="var(--color-expenses)" radius={4} />}
            </BarChart>
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
        <ChartContainer config={chartConfig} className={`mx-auto aspect-square h-[${height}px]`}>
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

// --- Expense by Type Chart ---
export function ExpenseByTypeChart({ expenses, height = 300 }: { expenses: WithId<Expense>[], height?: number }) {
  const expenseData = (expenses || []).reduce((acc, expense) => {
    acc[expense.type] = (acc[expense.type] || 0) + expense.amount;
    return acc;
  }, {} as Record<string, number>);

  const expenseChartData = Object.entries(expenseData).map(([name, value]) => ({ name, value }));

  const chartConfig = expenseChartData.reduce((acc, { name }, index) => {
    acc[name] = {
      label: name,
      color: `hsl(var(--chart-${(index % 5) + 1}))`,
    };
    return acc;
  }, {} as any);
  
  const totalExpenses = expenseChartData.reduce((acc, curr) => acc + curr.value, 0);

  return (
    <ChartContainer config={chartConfig} className={`mx-auto aspect-square h-[${height}px]`}>
      <PieChart>
        <ChartTooltip
          cursor={false}
          content={<ChartTooltipContent hideLabel formatter={(value) => `₹${(Number(value)).toLocaleString()}`} />}
        />
        <Pie
          data={expenseChartData}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={100}
          labelLine={false}
        >
          {expenseChartData.map((entry) => (
            <Cell key={entry.name} fill={chartConfig[entry.name]?.color} />
          ))}
            <Label
                content={({ viewBox }) => {
                    if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                        return (
                            <>
                                <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle" className="fill-foreground text-3xl font-bold">
                                    {totalExpenses.toLocaleString("en-IN", {
                                        style: "currency",
                                        currency: "INR",
                                        maximumFractionDigits: 0,
                                    })}
                                </text>
                                <text x={viewBox.cx} y={(viewBox.cy || 0) + 20} textAnchor="middle" dominantBaseline="middle" className="fill-muted-foreground">
                                    Total Expenses
                                </text>
                            </>
                        );
                    }
                }}
            />
        </Pie>
        <ChartLegend content={<ChartLegendContent nameKey="name" />} />
      </PieChart>
    </ChartContainer>
  );
}


// --- New Customers Chart ---
export function NewCustomersChart({ customers, height = 350 }: { customers: WithId<Customer>[], height?: number }) {
  const monthlyData = (customers || []).reduce((acc, customer) => {
    const monthKey = format(parseISO(customer.startDate), "MMM yyyy");
    acc[monthKey] = (acc[monthKey] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const newCustomersChartData = Object.entries(monthlyData)
    .map(([month, count]) => ({ month, count }))
    .sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime());

  const chartConfig = {
    count: { label: "New Customers", color: "hsl(var(--chart-1))" },
  };

  return (
    <ChartContainer config={chartConfig} className={`h-[${height}px] w-full`}>
      <BarChart accessibilityLayer data={newCustomersChartData}>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="month"
          tickLine={false}
          tickMargin={10}
          axisLine={false}
          tickFormatter={(value) => value.slice(0, 3)}
        />
        <YAxis tickFormatter={(value) => String(value)} />
        <ChartTooltip
          cursor={false}
          content={<ChartTooltipContent formatter={(value) => `${value} customers`} />}
        />
        <Bar dataKey="count" fill="var(--color-count)" radius={4} />
      </BarChart>
    </ChartContainer>
  );
}

// --- Capital Flow Chart ---
export function CapitalFlowChart({ customers, height = 350 }: { customers: WithId<Customer>[], height?: number }) {
  const monthlyFlows = (customers || []).reduce((acc, customer) => {
    // Outflow: New loan financed
    const startMonthKey = format(startOfMonth(parseISO(customer.startDate)), "MMM yyyy");
    acc[startMonthKey] = acc[startMonthKey] || { collected: 0, financed: 0 };
    acc[startMonthKey].financed += customer.financedAmount;

    // Inflow: Payments collected
    (customer.payments || []).forEach(payment => {
      const paymentMonthKey = format(startOfMonth(parseISO(payment.date)), "MMM yyyy");
      acc[paymentMonthKey] = acc[paymentMonthKey] || { collected: 0, financed: 0 };
      acc[paymentMonthKey].collected += payment.amount;
    });

    return acc;
  }, {} as Record<string, { collected: number; financed: number }>);

  let runningBalance = 0;
  const capitalFlowData = Object.entries(monthlyFlows)
    .map(([month, flows]) => ({ month, ...flows }))
    .sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime())
    .map(data => {
      const netFlow = data.collected - data.financed;
      runningBalance += netFlow;
      return {
        month: data.month,
        collected: data.collected,
        financed: data.financed,
        capitalPool: runningBalance
      };
    });
  
  const chartConfig = {
    capitalPool: { label: "Available Capital", color: "hsl(var(--chart-1))" },
    collected: { label: "Collected", color: "hsl(var(--chart-2))" },
    financed: { label: "Financed", color: "hsl(var(--destructive))" },
  };

  return (
     <ChartContainer config={chartConfig} className={`h-[${height}px] w-full`}>
      <LineChart accessibilityLayer data={capitalFlowData}>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="month"
          tickLine={false}
          tickMargin={10}
          axisLine={false}
          tickFormatter={(value) => value.slice(0, 3)}
        />
        <YAxis
          tickFormatter={(value) => `₹${Number(value) / 1000}k`}
        />
        <ChartTooltip
          cursor={false}
          content={<ChartTooltipContent
            formatter={(value, name) => `₹${(Number(value)).toLocaleString(undefined, {maximumFractionDigits: 0})}`}
            indicator="line"
            />}
        />
        <ChartLegend />
        <Line type="monotone" dataKey="capitalPool" stroke="var(--color-capitalPool)" strokeWidth={2} dot={true} />
      </LineChart>
    </ChartContainer>
  );
}
