import { NavLink, useLocation } from 'react-router-dom';
import { Shirt } from 'lucide-react';
import { cn } from '@/lib/utils';
import { NAV_SECTIONS } from './navConfig';

function isActive(pathname: string, href: string): boolean {
  if (href === '/dashboard') return pathname === '/dashboard';
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { pathname } = useLocation();

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-14 items-center gap-2 border-b px-4">
        <Shirt className="h-5 w-5 text-primary" />
        <span className="font-semibold">Textile Admin</span>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {NAV_SECTIONS.map((section) => {
          const active = isActive(pathname, section.href);
          return (
            <div key={section.href}>
              <NavLink
                to={section.href}
                onClick={onNavigate}
                className={cn(
                  'flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  active
                    ? 'bg-primary text-primary-foreground'
                    : 'text-foreground/80 hover:bg-accent hover:text-accent-foreground',
                )}
              >
                <section.icon className="h-4 w-4" />
                {section.label}
              </NavLink>
              {section.children && active && (
                <div className="ml-6 mt-1 space-y-0.5 border-l pl-3">
                  {section.children.map((child) => (
                    <NavLink
                      key={child.href}
                      to={child.href}
                      onClick={onNavigate}
                      end
                      className={({ isActive: childActive }) =>
                        cn(
                          'block rounded-md px-2 py-1.5 text-sm transition-colors',
                          childActive
                            ? 'font-medium text-primary'
                            : 'text-muted-foreground hover:text-foreground',
                        )
                      }
                    >
                      {child.label}
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>
    </div>
  );
}

export function Sidebar() {
  return (
    <aside className="hidden w-64 shrink-0 border-r bg-background md:block">
      <div className="fixed inset-y-0 left-0 w-64">
        <SidebarContent />
      </div>
    </aside>
  );
}
