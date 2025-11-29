
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
  useSidebar,
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
  CalendarCheck,
  Landmark,
  Building,
  Award,
} from 'lucide-react';
import { UserNav } from './user-nav';
import { useAuth } from '@/hooks/use-auth';

const menuItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/customers', label: 'Customers', icon: Users },
  { href: '/approvals', label: 'Approvals', icon: ShieldCheck },
  { href: '/emis', label: 'EMI Tracker', icon: CalendarClock },
  { href: '/collection', label: 'Collection', icon: CalendarCheck },
  { href: '/expenses', label: 'Expenses', icon: Receipt, adminOnly: true },
  { href: '/commissions', label: 'Commissions', icon: Award, adminOnly: true },
  { href: '/reports', label: 'Reports', icon: LineChart },
  { href: '/reminder', label: 'EMI Reminder', icon: Bot },
  { href: '/withdrawals', label: 'Withdrawals', icon: Landmark, adminOnly: true },
];

export function SidebarNav() {
  const pathname = usePathname();
  const { user } = useAuth();
  const { setOpenMobile, isMobile } = useSidebar();

  const handleLinkClick = () => {
    if (isMobile) {
        setOpenMobile(false);
    }
  }

  if (user?.role === 'superadmin') {
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
        <SidebarContent className="p-2 flex flex-col justify-between">
          <SidebarMenu>
            <SidebarMenuItem>
              <Link href="/dashboard" passHref onClick={handleLinkClick}>
                <SidebarMenuButton asChild isActive={pathname.startsWith('/dashboard')} tooltip="Admin Dashboard">
                  <div><LayoutDashboard /><span>Admin Dashboard</span></div>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
             <SidebarMenuItem>
              <Link href="/companies" passHref onClick={handleLinkClick}>
                <SidebarMenuButton asChild isActive={pathname.startsWith('/companies')} tooltip="Companies">
                  <div><Building /><span>Companies</span></div>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
             <SidebarMenuItem>
              <Link href="/users" passHref onClick={handleLinkClick}>
                <SidebarMenuButton asChild isActive={pathname.startsWith('/users')} tooltip="Users">
                  <div><Users /><span>Users</span></div>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <Link href="/withdrawals" passHref onClick={handleLinkClick}>
                <SidebarMenuButton asChild isActive={pathname.startsWith('/withdrawals')} tooltip="Withdrawals">
                  <div><Landmark /><span>Withdrawals</span></div>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
             <SidebarMenuItem>
              <Link href="/commissions" passHref onClick={handleLinkClick}>
                <SidebarMenuButton asChild isActive={pathname.startsWith('/commissions')} tooltip="Commissions">
                  <div><Award /><span>Commissions</span></div>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <Link href="/settings" passHref onClick={handleLinkClick}>
                <SidebarMenuButton asChild isActive={pathname.startsWith('/settings')} tooltip="Settings">
                  <div><Settings /><span>Settings</span></div>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter className="hidden md:flex">
           <UserNav />
        </SidebarFooter>
      </>
    );
  }

  const filteredMenuItems = menuItems.filter(item => !item.adminOnly || user?.role === 'admin' || user?.role === 'superadmin');

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
      <SidebarContent className="p-2 flex flex-col justify-between">
        <SidebarMenu>
          {filteredMenuItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              <Link href={item.href} passHref onClick={handleLinkClick}>
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
            <SidebarMenuItem key="/settings">
              <Link href="/settings" passHref onClick={handleLinkClick}>
                <SidebarMenuButton
                  asChild
                  isActive={pathname.startsWith("/settings")}
                  tooltip={"Settings"}
                >
                  <div>
                    <Settings />
                    <span>Settings</span>
                  </div>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="hidden md:flex">
         <UserNav />
      </SidebarFooter>
    </>
  );
}

    