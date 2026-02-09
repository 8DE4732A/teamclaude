import { App } from './App';
import { createApiClient } from './api/client';

async function bootstrap(): Promise<void> {
  const container = document.getElementById('app') ?? document.body;
  const apiClient = createApiClient();

  const app = await App(apiClient);
  container.append(app);
}

void bootstrap();
