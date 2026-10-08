import { ErrorMessagesService } from "./modules/error-messages/error-messages.service";
import { NestFactory } from "@nestjs/core";
import { SwaggerModule } from "@nestjs/swagger";

import { AppModule } from "./app.module";
import { configureHttpApplication } from "./shared/http/configure-http-app";
import { createSwaggerDocument } from "./swagger/swagger.config";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableShutdownHooks();

  configureHttpApplication(app, {
    errorMessages: app.get(ErrorMessagesService),
    apiPrefix: process.env.API_PREFIX ?? "api/v1",
  });

  const document = createSwaggerDocument(app);
  SwaggerModule.setup("docs", app, document);

  await app.listen(Number(process.env.PORT ?? 3000));
}

void bootstrap().catch((error: unknown) => {
  // eslint-disable-next-line no-console
  console.error("API bootstrap failed", error);
  process.exit(1);
});
