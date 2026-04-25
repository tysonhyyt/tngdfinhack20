import { SessionInitRequest, SessionInitResponse, SyncRequest, SyncResponse, PullRequest, PullResponse } from './types';
import { mockInitSession, mockPushTransactions, mockPullAccount } from './mock';

const USE_MOCK = true;
const BACKEND_URL = 'http://localhost:3000';

export async function apiInitSession(req: SessionInitRequest): Promise<SessionInitResponse> {
  if (USE_MOCK) return mockInitSession(req);
  const res = await fetch(`${BACKEND_URL}/session/init`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  });
  if (!res.ok) throw new Error(`Session init failed: ${res.status}`);
  return res.json();
}

export async function apiPushTransactions(req: SyncRequest): Promise<SyncResponse> {
  if (USE_MOCK) return mockPushTransactions(req);
  const res = await fetch(`${BACKEND_URL}/sync/push`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  });
  if (!res.ok) throw new Error(`Push failed: ${res.status}`);
  return res.json();
}

export async function apiPullAccount(req: PullRequest): Promise<PullResponse> {
  if (USE_MOCK) return mockPullAccount(req);
  const res = await fetch(`${BACKEND_URL}/account?deviceId=${req.deviceId}&role=${req.role}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) throw new Error(`Pull failed: ${res.status}`);
  return res.json();
}
