"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { UserButton } from '@clerk/nextjs';
import { useEffect, useState } from 'react';
import {
  DocumentTextIcon,
  ClockIcon,
  BookOpenIcon,
  Cog6ToothIcon,
  UsersIcon,
  ChartBarIcon,
  DocumentDuplicateIcon,
} from '@heroicons/react/24/outline';

interface NavigationItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  requiredRole?: string[];
}

const allNavigation: NavigationItem[] = [
  { name: 'Translate New Document', href: '/dashboard', icon: DocumentTextIcon },
  { name: 'Batch Translation', href: '/dashboard/batch', icon: DocumentDuplicateIcon },
  { name: 'Translation History', href: '/dashboard/history', icon: ClockIcon },
  { name: 'Glossary List', href: '/dashboard/glossaries', icon: BookOpenIcon },
  { name: 'My Tasks', href: '/tasks', icon: Cog6ToothIcon, requiredRole: ['translator', 'reviewer', 'approver', 'admin'] },
  { name: 'All Tasks', href: '/tasks/all', icon: ChartBarIcon, requiredRole: ['admin'] },
  { name: 'User Management', href: '/admin/users', icon: UsersIcon, requiredRole: ['admin'] },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [userRole, setUserRole] = useState<string>('creator');
  const [navigation, setNavigation] = useState<NavigationItem[]>([]);

  useEffect(() => {
    const fetchUserRole = async () => {
      try {
        const response = await fetch('/api/user/profile');
        const data = await response.json();
        if (data.success) {
          const role = data.user.role;
          setUserRole(role);
          
          // Filter navigation based on user role
          const filteredNavigation = allNavigation.filter(item => {
            if (!item.requiredRole) return true;
            return item.requiredRole.includes(role);
          });
          
          setNavigation(filteredNavigation);
        }
      } catch (error) {
        console.error('Failed to fetch user role:', error);
        // Default to basic navigation for creators
        setNavigation(allNavigation.filter(item => !item.requiredRole));
      }
    };

    fetchUserRole();
  }, []);

  return (
    <div className="flex h-screen w-64 flex-col bg-gray-50">
      <div className="flex flex-1 flex-col overflow-y-auto pt-5 pb-4">
        <div className="flex flex-shrink-0 items-center px-4">
          <h1 className="text-lg font-semibold text-gray-900">
            Translation Platform
          </h1>
        </div>
        <nav className="mt-8 flex-1 space-y-1 bg-gray-50 px-2">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`
                  group flex items-center px-2 py-2 text-sm font-medium rounded-md
                  ${
                    isActive
                      ? 'bg-gray-100 text-gray-900'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }
                `}
              >
                <item.icon
                  className={`
                    mr-3 flex-shrink-0 h-6 w-6
                    ${isActive ? 'text-gray-500' : 'text-gray-400 group-hover:text-gray-500'}
                  `}
                  aria-hidden="true"
                />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </div>
      <div className="flex flex-shrink-0 border-t border-gray-200 p-4">
        <div className="flex items-center">
          <UserButton afterSignOutUrl="/" />
          <div className="ml-3">
            <div className="text-sm font-medium text-gray-700">Activities</div>
            <div className="text-xs text-gray-500 capitalize">{userRole} Role</div>
          </div>
        </div>
      </div>
    </div>
  );
}