
"use client";

import { useMemo } from 'react';
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
  Loader2,
  UsersRound,
} from 'lucide-react';
import { UserNav } from './user-nav';
import { useAuth } from '@/hooks/use-auth';
import { useDoc, useFirestore } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { Company } from '@/types';

type MenuItem = {
  href: string;
  label: string;
  icon: any;
  roles: ('agent' | 'admin' | 'superadmin')[];
};

const menuItems: MenuItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['agent', 'admin', 'superadmin'] },
  { href: '/customers', label: 'Customers', icon: Users, roles: ['agent', 'admin', 'superadmin'] },
  { href: '/approvals', label: 'Approvals', icon: ShieldCheck, roles: ['admin', 'superadmin'] },
  { href: '/emis', label: 'EMI Tracker', icon: CalendarClock, roles: ['agent', 'admin', 'superadmin'] },
  { href: '/collection', label: 'Collection', icon: CalendarCheck, roles: ['agent', 'admin', 'superadmin'] },
  { href: '/expenses', label: 'Expenses', icon: Receipt, roles: ['admin', 'superadmin'] },
  { href: '/commissions', label: 'Commissions', icon: Award, roles: ['admin', 'superadmin'] },
  { href: '/reports', label: 'Reports', icon: LineChart, roles: ['agent', 'admin', 'superadmin'] },
  { href: '/reminder', label: 'EMI Reminder', icon: Bot, roles: ['agent', 'admin', 'superadmin'] },
  { href: '/withdrawals', label: 'Withdrawals', icon: Landmark, roles: ['admin', 'superadmin'] },
  { href: '/users', label: 'Users', icon: UsersRound, roles: ['admin', 'superadmin'] },
];

export function SidebarNav() {
  const pathname = usePathname();
  const { user } = useAuth();
  const firestore = useFirestore();
  const { setOpenMobile, isMobile } = useSidebar();

  const companyRef = useMemo(() => {
    if (!firestore || !user?.companyId) return null;
    return doc(firestore, 'companies', user.companyId);
  }, [firestore, user?.companyId]);

  const { data: company, isLoading: companyLoading } = useDoc<Company>(companyRef);

  const handleLinkClick = () => {
    if (isMobile) {
        setOpenMobile(false);
    }
  }

  const getDisplayName = () => {
    if (user?.role === 'superadmin') {
      return "Super Admin";
    }
    if (company) {
      return company.name;
    }
    return "...";
  }

  const filteredMenuItems = useMemo(() => {
    if (!user) return [];
    return menuItems.filter(item => item.roles.includes(user.role));
  }, [user]);

  return (
    <>
      <SidebarHeader>
        <div className="flex items-center gap-2 p-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shrink-0">
                <CreditCard className="h-5 w-5" />
            </div>
            <div className="font-headline text-lg font-semibold text-sidebar-foreground truncate">{getDisplayName()}</div>
        </div>
      </SidebarHeader>
      <SidebarContent className="p-2">
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

          {user?.role === 'superadmin' && (
            <>
              <SidebarMenuItem>
                <Link href="/companies" passHref onClick={handleLinkClick}>
                  <SidebarMenuButton asChild isActive={pathname.startsWith('/companies')} tooltip="Companies">
                    <div><Building /><span>Companies</span></div>
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
            </>
          )}

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
