import { useState } from 'react';
import { useRouter } from 'next/router';
import '../styles/globals.css';
import '../components/components.css';
import { ServerStatusBanner, TopBar } from '../components/components';
import { Sidebar } from '../components/Sidebar';

// Pages that render their own full-screen layout (no sidebar/topbar)
const NO_LAYOUT_ROUTES = ['/login', '/register', '/', '/404'];

function shouldShowLayout(pathname) {
  return !NO_LAYOUT_ROUTES.includes(pathname) && !pathname.startsWith('/api/');
}

import { FloatingChat } from '../components/FloatingChat';

export default function App({ Component, pageProps }) {
  const router = useRouter();
  // Collapsed state lives here so it NEVER resets between page navigations
  const [collapsed, setCollapsed] = useState(false);

  const withLayout = shouldShowLayout(router.pathname);

  if (!withLayout) {
    // Auth / landing pages render without sidebar
    return (
      <>
        <ServerStatusBanner />
        <Component {...pageProps} />
      </>
    );
  }

  return (
    <>
      <ServerStatusBanner />
      <div className="page-wrapper">
        <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(v => !v)} />
        <main className={`main-content ${collapsed ? 'main-content-wide' : ''}`}>
          <Component {...pageProps} key={router.asPath} />
        </main>
      </div>
      <FloatingChat />
    </>
  );
}
