import { createParamDecorator, ExecutionContext } from '@nestjs/common';

import { JwtPayload } from '../../modules/auth/interfaces/jwt-payload.interface';

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): JwtPayload | undefined => {
    const request = context.switchToHttp().getRequest<{ user?: JwtPayload }>();
    return request.user;
  },
);
