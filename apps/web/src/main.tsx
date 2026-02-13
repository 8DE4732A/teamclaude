import { App } from './App';
import { AdminDashboard } from './admin/AdminDashboard';
import { createApiClient } from './api/client';
import { NavBar } from './components/NavBar';
import { createRouter } from './router';

const NAV_ITEMS = [
  { label: 'Office', path: '/office' },
  { label: 'Admin', path: '/admin' },
];

function currentPath(): string {
  const hash = window.location.hash.replace(/^#/, '');
  return hash || '/office';
}

async function bootstrap(): Promise<void> {
  const container = document.getElementById('app') ?? document.body;
  const apiClient = createApiClient();

  try {
    await apiClient.checkAuth();
  } catch {
    window.location.href = '/auth/login';
    return;
  }

  const navBar = NavBar(NAV_ITEMS, currentPath());
  const contentArea = document.createElement('div');
  contentArea.setAttribute('data-testid', 'content-area');
  contentArea.style.cssText = 'min-height:0;flex:1;background:#1a1a2e;color:#e0e0e0;font-family:system-ui,sans-serif;';

  container.style.cssText = 'display:flex;flex-direction:column;min-height:100vh;margin:0;background:#1a1a2e;';
  container.append(navBar, contentArea);

  const router = createRouter(
    [
      { path: '/office', render: () => App(apiClient) },
      { path: '/admin', render: () => AdminDashboard(apiClient) },
    ],
    '/office',
  );

  window.addEventListener('hashchange', () => {
    const updatedNav = NavBar(NAV_ITEMS, currentPath());
    container.replaceChild(updatedNav, container.firstChild as Node);
  });

  router.mount(contentArea);
}

void bootstrap();
