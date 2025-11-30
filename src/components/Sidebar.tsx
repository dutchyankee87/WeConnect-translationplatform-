"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { UserButton } from '@clerk/nextjs';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DocumentTextIcon,
  ClockIcon,
  BookOpenIcon,
  Cog6ToothIcon,
  UsersIcon,
  ChartBarIcon,
  DocumentDuplicateIcon,
  Bars3Icon,
  XMarkIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';
import Tooltip from './ui/Tooltip';

interface NavigationItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  requiredRole?: string[];
  badge?: string;
}

const allNavigation: NavigationItem[] = [
  { name: 'Translate', href: '/dashboard', icon: DocumentTextIcon },
  { name: 'Batch Translation', href: '/dashboard/batch', icon: DocumentDuplicateIcon },
  { name: 'History', href: '/dashboard/history', icon: ClockIcon },
  { name: 'Glossaries', href: '/dashboard/glossaries', icon: BookOpenIcon },
  { name: 'My Tasks', href: '/tasks', icon: Cog6ToothIcon, requiredRole: ['translator', 'reviewer', 'approver', 'admin'] },
  { name: 'All Tasks', href: '/tasks/all', icon: ChartBarIcon, requiredRole: ['admin'] },
  { name: 'Users', href: '/admin/users', icon: UsersIcon, requiredRole: ['admin'] },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [userRole, setUserRole] = useState<string>('creator');
  const [navigation, setNavigation] = useState<NavigationItem[]>([]);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  useEffect(() => {
    const fetchUserRole = async () => {
      try {
        const response = await fetch('/api/user/profile');
        
        // Check if response is JSON before parsing
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          throw new Error('Response is not JSON');
        }
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        if (data.success) {
          const role = data.user.role;
          setUserRole(role);
          
          const filteredNavigation = allNavigation.filter(item => {
            if (!item.requiredRole) return true;
            return item.requiredRole.includes(role);
          });
          
          setNavigation(filteredNavigation);
        } else {
          // Handle API errors gracefully
          throw new Error(data.error || 'Failed to fetch user profile');
        }
      } catch (error) {
        console.error('Failed to fetch user role:', error);
        setNavigation(allNavigation.filter(item => !item.requiredRole));
      }
    };

    fetchUserRole();
  }, []);

  // Check if we're on mobile
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setIsMobileOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-white shadow-md border border-slate-200"
        aria-label="Toggle menu"
      >
        {isMobileOpen ? (
          <XMarkIcon className="w-6 h-6 text-slate-700" />
        ) : (
          <Bars3Icon className="w-6 h-6 text-slate-700" />
        )}
      </button>

      {/* Mobile Overlay */}
      <AnimatePresence>
        {isMobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileOpen(false)}
              className="lg:hidden fixed inset-0 bg-black/50 z-40"
            />
            <motion.div
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="lg:hidden fixed left-0 top-0 bottom-0 w-[280px] z-50"
            >
              <SidebarContent
                pathname={pathname}
                navigation={navigation}
                userRole={userRole}
                isCollapsed={false}
                onCollapse={() => {}}
                onClose={() => setIsMobileOpen(false)}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Desktop Sidebar */}
      <div className="hidden lg:flex">
        <SidebarContent
          pathname={pathname}
          navigation={navigation}
          userRole={userRole}
          isCollapsed={isCollapsed}
          onCollapse={() => setIsCollapsed(!isCollapsed)}
        />
      </div>
    </>
  );
}

function SidebarContent({
  pathname,
  navigation,
  userRole,
  isCollapsed,
  onCollapse,
  onClose,
}: {
  pathname: string;
  navigation: NavigationItem[];
  userRole: string;
  isCollapsed: boolean;
  onCollapse: () => void;
  onClose?: () => void;
}) {
  return (
    <motion.div
      initial={false}
      animate={{ width: isCollapsed ? '80px' : '280px' }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className="flex h-screen flex-col bg-gradient-to-b from-slate-50 to-white border-r border-slate-200 shadow-sm"
    >
      {/* Logo Section */}
      <div className="flex items-center justify-between px-4 py-6 border-b border-slate-200">
        <AnimatePresence mode="wait">
          {!isCollapsed ? (
            <motion.div
              key="expanded"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="flex items-center space-x-3"
            >
              <div className="p-2 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl shadow-lg">
                <SparklesIcon className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  WeConnect
                </h1>
                <p className="text-xs text-slate-500">Translation Platform</p>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="collapsed"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex justify-center w-full"
            >
              <div className="p-2 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl shadow-lg">
                <SparklesIcon className="w-6 h-6 text-white" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Collapse Button (Desktop only) */}
        {!onClose && (
          <button
            onClick={onCollapse}
            className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <Bars3Icon className={`w-5 h-5 text-slate-600 transition-transform ${isCollapsed ? 'rotate-90' : ''}`} />
          </button>
        )}

        {/* Close Button (Mobile only) */}
        {onClose && (
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
            aria-label="Close menu"
          >
            <XMarkIcon className="w-5 h-5 text-slate-600" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {navigation.map((item) => {
          const isActive = pathname === item.href || (pathname.startsWith(item.href + '/') && item.href !== '/dashboard');
          const Icon = item.icon;

          const linkContent = (
            <Link
              href={item.href}
              onClick={onClose}
              className={`
                group flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200
                ${isActive
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-200'
                  : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                }
              `}
            >
              <Icon className={`
                flex-shrink-0 w-5 h-5 transition-colors
                ${isActive ? 'text-white' : 'text-slate-500 group-hover:text-slate-700'}
              `} />
              {!isCollapsed && (
                <span className="ml-3 flex-1">{item.name}</span>
              )}
              {item.badge && !isCollapsed && (
                <span className="ml-2 px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                  {item.badge}
                </span>
              )}
            </Link>
          );

          return isCollapsed ? (
            <Tooltip key={item.name} content={item.name} position="right">
              {linkContent}
            </Tooltip>
          ) : (
            <div key={item.name}>{linkContent}</div>
          );
        })}
      </nav>

      {/* User Section */}
      <div className="border-t border-slate-200 p-4">
        <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'space-x-3'}`}>
          <UserButton 
            afterSignOutUrl="/"
            appearance={{
              elements: {
                avatarBox: "w-10 h-10",
              }
            }}
          />
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 truncate">Account</p>
              <p className="text-xs text-slate-500 capitalize">{userRole} Role</p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
