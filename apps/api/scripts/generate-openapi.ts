import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

import { NestFactory } from '@nestjs/core';

import { AppModule } from '../src/app.module';
import { createSwaggerDocument } from '../src/swagger/swagger.config';

async function generateOpenApi(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    logger: false,
  });

  app.setGlobalPrefix(process.env.API_PREFIX ?? 'api/v1');

  const document = createSwaggerDocument(app);
  const payload = JSON.stringify(document, null, 2);
  const outputPaths = [
    join(process.cwd(), 'docs', 'openapi.json'),
    join(process.cwd(), '..', '..', 'docs', 'api', 'openapi.json'),
  ];

  for (const outputPath of outputPaths) {
    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(outputPath, payload);
  }

  await app.close();
}

void generateOpenApi();
