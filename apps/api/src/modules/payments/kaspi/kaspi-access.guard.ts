import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';

@Injectable()
export class KaspiAccessGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    // Express resolves trusted proxies only when TRUST_PROXY is configured.
    // Never authorize using an arbitrary caller-supplied forwarding header.
    const ip = (request.ip ?? '').replace(/^::ffff:/, '');
    const allowed = (this.config.get<string>('KASPI_ALLOWED_IPS') ?? '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);
    if (
      this.config.get<string>('KASPI_ENABLED') !== 'true' ||
      !allowed.includes(ip)
    ) {
      throw new ForbiddenException({
        code: 'KASPI_ACCESS_DENIED',
        message: 'Kaspi endpoint is disabled or source IP is not authorized',
      });
    }
    return true;
  }
}
