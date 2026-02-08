'use client';

import { Dispatch, SetStateAction } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { DateRange } from 'react-day-picker';
import type { Customer, WithId } from '@/types';

interface FiltersProps {
    customers: WithId<Customer>[];
    dateRange: DateRange | undefined;
    setDateRange: Dispatch<SetStateAction<DateRange | undefined>>;
    selectedStatus: string;
    setSelectedStatus: Dispatch<SetStateAction<string>>;
    selectedCustomer: string;
    setSelectedCustomer: Dispatch<SetStateAction<string>>;
    resetFilters: () => void;
    slug: string;
}

const reportsWithStatusFilter = ['loan-ledger'];
const reportsWithCustomerFilter = ['loan-ledger'];

export function DetailedReportFilters({
    customers,
    dateRange,
    setDateRange,
    selectedStatus,
    setSelectedStatus,
    selectedCustomer,
    setSelectedCustomer,
    resetFilters,
    slug
}: FiltersProps) {
    const hasActiveFilters = dateRange || selectedStatus !== 'all' || selectedCustomer !== 'all';

    return (
        <div className="p-4 border rounded-lg bg-card">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                <div className="space-y-2">
                    <label className="text-sm font-medium">Date Range</label>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                            id="date"
                            variant={"outline"}
                            className={cn(
                                "w-full justify-start text-left font-normal",
                                !dateRange && "text-muted-foreground"
                            )}
                            >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {dateRange?.from ? (
                                dateRange.to ? (
                                <>
                                    {format(dateRange.from, "LLL dd, y")} -{" "}
                                    {format(dateRange.to, "LLL dd, y")}
                                </>
                                ) : (
                                format(dateRange.from, "LLL dd, y")
                                )
                            ) : (
                                <span>Pick a date range</span>
                            )}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                            initialFocus
                            mode="range"
                            defaultMonth={dateRange?.from}
                            selected={dateRange}
                            onSelect={setDateRange}
                            numberOfMonths={2}
                            />
                        </PopoverContent>
                    </Popover>
                </div>
                
                {reportsWithStatusFilter.includes(slug) && (
                     <div className="space-y-2">
                        <label className="text-sm font-medium">Loan Status</label>
                        <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                            <SelectTrigger>
                                <SelectValue placeholder="Filter by status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Statuses</SelectItem>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="active">Active</SelectItem>
                                <SelectItem value="overdue">Overdue</SelectItem>
                                <SelectItem value="completed">Completed</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                )}
                
                {reportsWithCustomerFilter.includes(slug) && (
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Customer</label>
                        <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
                            <SelectTrigger>
                                <SelectValue placeholder="Filter by customer" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Customers</SelectItem>
                                {customers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                )}

                {hasActiveFilters && (
                    <Button onClick={resetFilters} variant="ghost">Clear Filters</Button>
                )}
            </div>
        </div>
    )
}
