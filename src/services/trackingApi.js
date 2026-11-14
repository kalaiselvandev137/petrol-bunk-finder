import AsyncStorage from '@react-native-async-storage/async-storage';
import apiurl from './apiendpoint';


const SESSION_KEY = 'tracking_session'; // { sessionId, date }
const QUEUE_KEY = 'tracking_queue';     // points waiting to upload
const BATCH = 100;
const MAX_QUEUE = 5000;                 // ~2 days of points at 30 s

export const istDate = () =>
  new Date(Date.now() + 5.5 * 3600 * 1000).toISOString().slice(0, 10);

// ---- low-level -------------------------------------------------------------

async function request(path, { method = 'GET', body } = {}) {
  // the background task has no React context, so read the token from storage
  const token = await AsyncStorage.getItem('auth_token');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch(`${apiurl()}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || json.success === false) {
      const err = new Error(json.message || `Request failed (${res.status})`);
      err.status = res.status;
      throw err;
    }
    return json;
  } finally {
    clearTimeout(timer);
  }
}

const readJson = async (key, fallback) => {
  const raw = await AsyncStorage.getItem(key);
  return raw ? JSON.parse(raw) : fallback;
};

// serialises storage + upload work so nothing overwrites anything
let chain = Promise.resolve();
const locked = (fn) => {
  const run = chain.then(fn);
  chain = run.catch(() => {});
  return run;
};

// ---- consent ---------------------------------------------------------------

export const apiGetTrackingConsent = () => request('/tracking/apigetconsent');
export const apiSaveTrackingConsent = () =>
  request('/tracking/apisaveconsent', { method: 'POST', body: { noticeVersion: 1 } });

// ---- session ---------------------------------------------------------------

async function ensureSessionInner() {
  const stored = await readJson(SESSION_KEY, null);
  if (stored && stored.date === istDate()) return stored;

const { session } = await request('/tracking/apistartsession', { method: 'POST' });
  const next = { sessionId: session._id, date: session.date };
  await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(next));
  return next;
}

export const ensureTrackingSession = () => locked(ensureSessionInner);

// ---- points queue + upload -------------------------------------------------

export const enqueuePoints = (points) =>
  locked(async () => {
    const queue = await readJson(QUEUE_KEY, []);
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify([...queue, ...points].slice(-MAX_QUEUE)));
  });

async function flushInner() {
  let queue = await readJson(QUEUE_KEY, []);
  while (queue.length) {
    const batch = queue.slice(0, BATCH);
    const send = async (sessionId) =>
      request('/tracking/apisavelocationpoints', {
        method: 'POST',
        body: { sessionId, points: batch },
      });

    let session = await ensureSessionInner();
    try {
      await send(session.sessionId);
    } catch (e) {
      if (e.status === 404 || e.status === 409) {
        // session missing or already closed on the server: start a fresh one and retry once
        await AsyncStorage.removeItem(SESSION_KEY);
        session = await ensureSessionInner();
        await send(session.sessionId);
      } else {
        throw e; // offline / server error: keep the queue, try again later
      }
    }
    queue = queue.slice(batch.length);
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  }
}

export const flushTrackingQueue = () =>
  locked(async () => {
    try {
      await flushInner();
      return true;
    } catch (e) {
      console.warn('Tracking upload deferred:', e.message);
      return false;
    }
  });

export const endTrackingSession = () =>
  locked(async () => {
    try { await flushInner(); } catch {}
    const stored = await readJson(SESSION_KEY, null);
    if (stored) {
      try {
        await request('/tracking/apiendsession', { method: 'PUT', body: { sessionId: stored.sessionId } });
      } catch {}
    }
    // clear so a different user logging in on this phone never inherits old data
    await AsyncStorage.multiRemove([SESSION_KEY, QUEUE_KEY]);
  });