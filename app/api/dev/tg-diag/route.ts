// ВРЕМЕННЫЙ диагностический endpoint для проверки сетевого доступа к Telegram API с прода.
// После выяснения причины удалить.

import { NextResponse } from 'next/server';
import dns from 'node:dns/promises';
import net from 'node:net';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function tcpConnect(host: string, port: number, timeoutMs: number): Promise<{ ok: boolean; error?: string; ms?: number }> {
  return new Promise((resolve) => {
    const start = Date.now();
    const socket = new net.Socket();
    const done = (result: { ok: boolean; error?: string }) => {
      socket.destroy();
      resolve({ ...result, ms: Date.now() - start });
    };
    socket.setTimeout(timeoutMs);
    socket.once('connect', () => done({ ok: true }));
    socket.once('timeout', () => done({ ok: false, error: 'timeout' }));
    socket.once('error', (e) => done({ ok: false, error: e.message }));
    socket.connect(port, host);
  });
}

async function httpsTest(url: string, timeoutMs: number): Promise<{ status?: number; error?: string; ms: number }> {
  const start = Date.now();
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
    return { status: res.status, ms: Date.now() - start };
  } catch (e: any) {
    return { error: `${e.name}: ${e.message}${e.cause ? ` (cause: ${e.cause.message ?? e.cause})` : ''}`, ms: Date.now() - start };
  }
}

export async function GET() {
  const target = 'api.telegram.org';

  let dnsResult: any;
  try {
    const records = await dns.lookup(target, { all: true });
    dnsResult = { ok: true, records };
  } catch (e: any) {
    dnsResult = { ok: false, error: e.message };
  }

  const tcpResults: Record<string, any> = {};
  if (dnsResult.ok) {
    for (const r of dnsResult.records.slice(0, 3)) {
      tcpResults[`${r.address}:443`] = await tcpConnect(r.address, 443, 5000);
    }
  }

  const httpsResults = {
    'GET https://api.telegram.org': await httpsTest('https://api.telegram.org', 5000),
    'GET https://google.com (sanity)': await httpsTest('https://google.com', 5000),
    'GET https://api.resend.com (works)': await httpsTest('https://api.resend.com', 5000),
  };

  return NextResponse.json({
    target,
    dns: dnsResult,
    tcp: tcpResults,
    https: httpsResults,
    server_ip: 'see logs / outbound NAT',
    note: 'ConnectTimeout = TCP SYN не получает ответа = блокировка на сетевом уровне',
  });
}
