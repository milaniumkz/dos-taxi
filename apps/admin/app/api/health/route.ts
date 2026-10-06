import { NextResponse } from 'next/server';

import { getBackofficeSnapshot } from '../../lib/backoffice';

export async function GET() {
  const snapshot = await getBackofficeSnapshot();

  return NextResponse.json({
    status: 'ok',
    mode: snapshot.mode,
    sourceLabel: snapshot.sourceLabel,
    warnings: snapshot.warnings,
    generatedAt: snapshot.generatedAt,
  });
}
