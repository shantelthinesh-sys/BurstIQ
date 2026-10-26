import { useState } from 'react';
import { AppProvider, useApp } from '@/store';
import { Sidebar } from '@/components/Sidebar';
import { TopBar } from '@/components/TopBar';
import { OverviewPage } from '@/pages/OverviewPage';
import { SimulatorPage } from '@/pages/SimulatorPage';
import { DetectionPage } from '@/pages/DetectionPage';
import { LabPage } from '@/pages/LabPage';
import { AnalyticsPage } from '@/pages/AnalyticsPage';
import { WhatIfPage } from '@/pages/WhatIfPage';
import { HistoryPage } from '@/pages/HistoryPage';
import { ReportsPage } from '@/pages/ReportsPage';
import { AboutPage } from '@/pages/AboutPage';

function Shell() {
  const { page, setPage, running, toggleRun, reset, simTime } = useApp();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-navy-950 bg-grid-glow">
      <div className="hidden lg:block">
        <Sidebar
          page={page}
          onNavigate={(p) => setPage(p)}
          collapsed={collapsed}
          onToggle={() => setCollapsed((c) => !c)}
        />
      </div>

      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
          <div className="relative">
            <Sidebar
              page={page}
              onNavigate={(p) => { setPage(p); setMobileOpen(false); }}
              collapsed={false}
              onToggle={() => {}}
            />
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <TopBar
          running={running}
          onToggleRun={toggleRun}
          onReset={reset}
          simTime={simTime}
          mobileMenu={mobileOpen}
          onMobileMenu={() => setMobileOpen((o) => !o)}
        />
        <main className="flex-1 overflow-y-auto scrollbar-thin p-4 sm:p-6 max-w-[1600px] w-full mx-auto animate-slideIn">
          {page === 'overview' && <OverviewPage />}
          {page === 'simulator' && <SimulatorPage />}
          {page === 'detection' && <DetectionPage />}
          {page === 'lab' && <LabPage />}
          {page === 'analytics' && <AnalyticsPage />}
          {page === 'whatif' && <WhatIfPage />}
          {page === 'history' && <HistoryPage />}
          {page === 'reports' && <ReportsPage />}
          {page === 'about' && <AboutPage />}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <Shell />
    </AppProvider>
  );
}
