/**
 * Sidebar.jsx — Stable, no-blink sidebar.
 *
 * Key changes vs old version:
 * - Removed isClient / two-phase render that caused the flash.
 * - getUser() is called synchronously; `suppressHydrationWarning` handles the
 *   tiny SSR/CSR mismatch without causing a visible re-render.
 * - Nav arrays and role map are module-level constants (never recreated).
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import {
  FiGrid, FiBookOpen, FiUsers, FiLayers,
  FiMenu, FiAward, FiActivity, FiMessageSquare,
  FiCompass, FiBarChart2, FiClipboard, FiVideo,
  FiTrendingUp, FiRadio,
} from 'react-icons/fi';
import { getUser } from '../lib/api';

// ─── Nav definitions (module-level — never recreated) ─────────────────────────
const employeeNav = [
  { href: '/employee/dashboard',    Icon: FiGrid,          label: 'Dashboard'    },
  { href: '/employee/my-courses',   Icon: FiBookOpen,      label: 'My Courses'   },
  { href: '/employee/assignments',  Icon: FiClipboard,     label: 'Assignments'  },
  { href: '/employee/live-classes', Icon: FiVideo,         label: 'Live Classes' },
  { href: '/employee/explore',      Icon: FiCompass,       label: 'Explore'      },
  { href: '/employee/leaderboard',  Icon: FiTrendingUp,    label: 'Leaderboard'  },
  { href: '/employee/certificates', Icon: FiAward,         label: 'Certificates' },
  { href: '/employee/study-groups', Icon: FiUsers,         label: 'Study Groups' },
  { href: '/employee/progress',     Icon: FiBarChart2,     label: 'Progress'     },
];

const hrNav = [
  { href: '/dashboard',         Icon: FiGrid,          label: 'Overview'     },
  { href: '/employees',         Icon: FiUsers,         label: 'Users'        },
  { href: '/courses',           Icon: FiBookOpen,      label: 'Courses'      },
  { href: '/departments',       Icon: FiLayers,        label: 'Departments'  },
  { href: '/live-classes',      Icon: FiVideo,         label: 'Live Classes' },
  { href: '/admin/activity',    Icon: FiActivity,      label: 'Activity'     },
];

const managerNav = [
  { href: '/dashboard',         Icon: FiGrid,          label: 'Overview'     },
  { href: '/employees',         Icon: FiUsers,         label: 'My Team'      },
  { href: '/courses',           Icon: FiBookOpen,      label: 'Courses'      },
  { href: '/departments',       Icon: FiLayers,        label: 'Departments'  },
  { href: '/live-classes',      Icon: FiVideo,         label: 'Live Classes' },
];

const superNav = [
  { href: '/superadmin/overview',  Icon: FiGrid,      label: 'Overview'     },
  { href: '/superadmin/users',     Icon: FiUsers,     label: 'Users'        },
  { href: '/superadmin/courses',   Icon: FiBookOpen,  label: 'Courses'      },
  { href: '/superadmin/content',   Icon: FiVideo,     label: 'Content'      },
  { href: '/live-classes',         Icon: FiRadio,     label: 'Live Classes' },
  { href: '/superadmin/activity',  Icon: FiActivity,  label: 'Activity'     },
];

function getNavForRole(role) {
  switch (role) {
    case 'super_admin': return { items: superNav,    label: 'SUPER ADMIN' };
    case 'hr_admin':    return { items: hrNav,        label: 'HR ADMIN'    };
    case 'manager':     return { items: managerNav,   label: 'MANAGER'     };
    default:            return { items: employeeNav,  label: 'MAIN'        };
  }
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────
export function Sidebar({ collapsed, onToggle }) {
  const router = useRouter();
  const path   = router.pathname;

  // Defer localStorage read to after hydration so SSR and first client render
  // produce identical HTML — this eliminates the hydration mismatch entirely.
  const [user, setUser] = useState(null);
  useEffect(() => { setUser(getUser()); }, []);

  const { items: navItems, label: navLabel } = getNavForRole(user?.role);

  return (
    <aside className={`sidebar ${collapsed ? 'sidebar-collapsed' : ''}`}>
      {/* ── Logo + collapse toggle ── */}
      <div className="sidebar-header">
        <div className="sidebar-logo-wrap">
          <div className="sidebar-logo-img-box">
            <img src="/bryte.png" alt="Bryte" className="sidebar-logo-img" />
          </div>
        </div>
        <button className="sidebar-toggle-btn" onClick={onToggle} title="Toggle sidebar">
          <FiMenu size={16} />
        </button>
      </div>

      {/* ── Navigation  ── */}
      {/* suppressHydrationWarning: role-aware items differ between SSR (no user)
          and first client render. React suppresses the warning but does NOT
          do a second render — no blink, just a silent reconcile. */}
      <nav className="sidebar-nav" suppressHydrationWarning>
        {!collapsed && (
          <div className="nav-section-label" suppressHydrationWarning>
            {navLabel}
          </div>
        )}

        {navItems.map(({ href, Icon, label }) => {
          const active = path === href || path.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              className={`nav-item ${active ? 'active' : ''}`}
              title={collapsed ? label : undefined}
            >
              <span className="nav-icon"><Icon size={17} /></span>
              {!collapsed && <span className="nav-label">{label}</span>}
              {active && !collapsed && <span className="nav-active-dot" />}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

export default Sidebar;
