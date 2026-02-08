import 'reflect-metadata';

import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module';

const DEFAULT_PORT = 3000;

function resolvePort(portValue: string | undefined): number {
  const parsedPort = Number.parseInt(portValue ?? '', 10);

  if (!Number.isInteger(parsedPort) || parsedPort <= 0 || parsedPort > 65535) {
    return DEFAULT_PORT;
  }

  return parsedPort;
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const port = resolvePort(process.env.PORT);
  await app.listen(port);
}

void bootstrap().catch((error: unknown) => {
  console.error('Failed to start server', error);
  process.exit(1);
});
