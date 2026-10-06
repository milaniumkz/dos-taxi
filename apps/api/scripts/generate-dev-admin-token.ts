import { UserRole } from '@dos/shared-types';
import { JwtService } from '@nestjs/jwt';

const allowedRoles = [
  UserRole.ADMIN,
  UserRole.OPERATOR,
  UserRole.SUPPORT,
  UserRole.FINANCE,
] as const;

type AllowedAdminRole = (typeof allowedRoles)[number];

function resolveRole(rawRole: string | undefined): AllowedAdminRole {
  if (!rawRole) {
    return UserRole.ADMIN;
  }

  if (allowedRoles.includes(rawRole as AllowedAdminRole)) {
    return rawRole as AllowedAdminRole;
  }

  throw new Error(
    `Unsupported admin token role: ${rawRole}. Allowed roles: ${allowedRoles.join(', ')}`,
  );
}

async function main(): Promise<void> {
  const nodeEnv = process.env.NODE_ENV ?? 'development';
  const allowProduction =
    process.env.ALLOW_PRODUCTION_DEV_TOKEN === 'true';

  if (nodeEnv === 'production' && !allowProduction) {
    throw new Error(
      'Refusing to generate a development admin token in production. Set ALLOW_PRODUCTION_DEV_TOKEN=true to override.',
    );
  }

  const secret = process.env.JWT_SECRET ?? 'development-secret';
  const expiresIn = process.env.ADMIN_TOKEN_EXPIRES_IN ?? '2h';
  const role = resolveRole(process.env.ADMIN_TOKEN_ROLE);
  const payload = {
    sub:
      process.env.ADMIN_TOKEN_SUB ??
      process.env.DEV_ADMIN_USER_ID ??
      '00000000-0000-4000-8000-000000000001',
    phone:
      process.env.ADMIN_TOKEN_PHONE ??
      process.env.DEV_ADMIN_PHONE ??
      '+77000000001',
    role,
  };

  const jwtService = new JwtService({
    secret,
  });
  const token = await jwtService.signAsync(payload, {
    expiresIn,
  });

  process.stdout.write(token);
}

void main().catch((error: unknown) => {
  const message =
    error instanceof Error ? error.message : 'Unknown token generation error';
  // eslint-disable-next-line no-console
  console.error(message);
  process.exit(1);
});
