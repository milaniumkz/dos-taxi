import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export function buildSwaggerConfig() {
  return new DocumentBuilder()
    .setTitle('DOS Platform API')
    .setDescription('Core API for the DOS transportation platform')
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();
}

export function createSwaggerDocument(app: INestApplication) {
  return SwaggerModule.createDocument(app, buildSwaggerConfig());
}
