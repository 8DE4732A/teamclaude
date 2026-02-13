import type { TeamMemberStats } from '../../api/client';

export function TeamMemberTable(members: TeamMemberStats[]): HTMLElement {
  const container = document.createElement('section');
  container.setAttribute('data-testid', 'team-member-table');
  container.style.cssText = 'background:#16213e;border-radius:8px;padding:20px;border:1px solid #2a2a4a;';

  const title = document.createElement('h3');
  title.textContent = 'Team Members';
  title.style.cssText = 'color:#e0e0e0;font-size:14px;margin:0 0 16px 0;font-weight:600;';
  container.append(title);

  const table = document.createElement('table');
  table.style.cssText = 'width:100%;border-collapse:collapse;color:#e0e0e0;font-size:13px;';

  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');
  const headers = ['User', 'Interactions', 'Last Active', 'Status'];
  for (const h of headers) {
    const th = document.createElement('th');
    th.textContent = h;
    th.style.cssText = 'text-align:left;padding:8px 12px;border-bottom:1px solid #2a2a4a;color:#999;font-weight:600;';
    headerRow.append(th);
  }
  thead.append(headerRow);
  table.append(thead);

  const tbody = document.createElement('tbody');
  for (const member of members) {
    const row = document.createElement('tr');
    row.setAttribute('data-testid', `member-row-${member.userId}`);
    row.style.cssText = 'border-bottom:1px solid #1a1a3a;';

    const tdUser = document.createElement('td');
    tdUser.textContent = member.userId;
    tdUser.style.cssText = 'padding:8px 12px;';

    const tdInteractions = document.createElement('td');
    tdInteractions.textContent = String(member.interactions);
    tdInteractions.style.cssText = 'padding:8px 12px;';

    const tdLastActive = document.createElement('td');
    tdLastActive.textContent = member.lastActiveAt
      ? new Date(member.lastActiveAt).toLocaleTimeString()
      : 'N/A';
    tdLastActive.style.cssText = 'padding:8px 12px;';

    const tdStatus = document.createElement('td');
    tdStatus.style.cssText = 'padding:8px 12px;';
    const badge = document.createElement('span');
    badge.setAttribute('data-testid', `status-badge-${member.userId}`);
    badge.textContent = member.status;
    const statusColors: Record<string, string> = {
      active: '#4caf50',
      idle: '#ff9800',
      offline: '#666',
    };
    badge.style.cssText = `display:inline-block;padding:2px 8px;border-radius:10px;font-size:11px;color:#fff;background:${statusColors[member.status] ?? '#666'};`;
    tdStatus.append(badge);

    row.append(tdUser, tdInteractions, tdLastActive, tdStatus);
    tbody.append(row);
  }
  table.append(tbody);
  container.append(table);
  return container;
}
