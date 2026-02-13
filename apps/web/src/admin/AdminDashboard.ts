import type { ApiClient } from '../api/client';
import { TeamOverviewCards } from './components/TeamOverviewCards';
import { TeamTrendChart } from './components/TeamTrendChart';
import { ActivityHeatmap } from './components/ActivityHeatmap';
import { TeamMemberTable } from './components/TeamMemberTable';

export async function AdminDashboard(apiClient: ApiClient): Promise<HTMLElement> {
  const root = document.createElement('main');
  root.setAttribute('data-testid', 'admin-dashboard');
  root.style.cssText = 'padding:24px;max-width:960px;margin:0 auto;';

  const heading = document.createElement('h2');
  heading.textContent = 'Admin Dashboard';
  heading.style.cssText = 'color:#e0e0e0;font-size:20px;margin:0 0 24px 0;font-weight:700;';
  root.append(heading);

  const [membersRes, trend] = await Promise.all([
    apiClient.getTeamMembers(),
    apiClient.getTeamTrend(),
  ]);

  root.append(
    TeamOverviewCards(membersRes.summary),
    TeamTrendChart(trend),
    ActivityHeatmap(membersRes.heatmap),
    TeamMemberTable(membersRes.members),
  );

  return root;
}
