
"use client";

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
} from '@/components/ui/sidebar';
import {
  CreditCard,
  LayoutDashboard,
  Users,
  CalendarClock,
  LineChart,
  Settings,
  Bot,
  Receipt,
  ShieldCheck,
} from 'lucide-react';
import { UserNav } from './user-nav';
import { useAuth } from '@/hooks/use-auth';

const menuItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/customers', label: 'Customers', icon: Users },
  { href: '/approvals', label: 'Approvals', icon: ShieldCheck },
  { href: '/emis', label: 'EMI Tracker', icon: CalendarClock },
  { href: '/expenses', label: 'Expenses', icon: Receipt, adminOnly: true },
  { href: '/reports', label: 'Reports', icon: LineChart },
  { href: '/reminder', label: 'EMI Reminder', icon: Bot },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export function SidebarNav() {
  const pathname = usePathname();
  const { user } = useAuth();

  const filteredMenuItems = menuItems.filter(item => !item.adminOnly || user?.role === 'admin');

  return (
    <>
      <SidebarHeader>
        <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <CreditCard className="h-5 w-5" />
            </div>
            <span className="font-headline text-lg font-semibold text-sidebar-foreground">FINSERV</span>
        </div>
      </SidebarHeader>
      <SidebarContent className="p-2">
        <SidebarMenu>
          {filteredMenuItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              <Link href={item.href} passHref>
                <SidebarMenuButton
                  asChild
                  isActive={pathname.startsWith(item.href)}
                  tooltip={item.label}
                >
                  <div>
                    <item.icon />
                    <span>{item.label}</span>
                  </div>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="hidden md:flex">
         <UserNav />
      </SidebarFooter>
    </>
  );
}
