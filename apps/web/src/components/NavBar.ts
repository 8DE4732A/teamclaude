export interface NavItem {
  label: string;
  path: string;
}

export function NavBar(items: NavItem[], currentHash: string): HTMLElement {
  const nav = document.createElement('nav');
  nav.setAttribute('data-testid', 'nav-bar');
  nav.style.cssText =
    'display:flex;align-items:center;gap:24px;padding:0 24px;height:48px;background:#0f0f23;border-bottom:1px solid #2a2a4a;';

  const brand = document.createElement('span');
  brand.textContent = 'TeamClaude';
  brand.style.cssText = 'font-weight:700;font-size:16px;color:#4fc3f7;margin-right:auto;';
  nav.append(brand);

  for (const item of items) {
    const link = document.createElement('a');
    link.textContent = item.label;
    link.href = `#${item.path}`;
    link.setAttribute('data-testid', `nav-link-${item.path.replace('/', '')}`);
    const isActive = currentHash === item.path;
    link.style.cssText = `text-decoration:none;padding:4px 12px;border-radius:4px;font-size:14px;color:${isActive ? '#fff' : '#999'};background:${isActive ? '#4fc3f7' : 'transparent'};`;
    nav.append(link);
  }

  return nav;
}
