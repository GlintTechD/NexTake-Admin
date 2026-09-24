import crypto from 'node:crypto';
import fs from 'node:fs';
import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(root, '..');
const port = Number(process.env.PORT || 5174);
const isProduction = process.env.NODE_ENV === 'production';
const username = 'NexTakeAfrica';
const otpTtlMs = 5 * 60 * 1000;
const resendCooldownMs = 60 * 1000;
const inactivityTimeoutMs = 20 * 60 * 1000;
const maxAttempts = 5;
const maxRequestsPerWindow = 5;
const requestWindowMs = 15 * 60 * 1000;
const challenges = new Map();
const sessions = new Map();
const requestWindows = new Map();

const loadEnv = () => {
  const envPath = path.join(projectRoot, '.env');
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z][A-Z0-9_]*)\s*=\s*["']?(.*?)["']?\s*$/);
    if (match && process.env[match[1]] === undefined) process.env[match[1]] = match[2];
  }
};
loadEnv();

const parseCookies = (value = '') => new Map(value.split(';').map((part) => part.trim().split('=')));
const cookieOptions = (maxAge) => `Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge};${isProduction ? ' Secure;' : ''}`;
const sendJson = (response, status, payload, headers = {}) => {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', ...headers });
  response.end(JSON.stringify(payload));
};
const readBody = async (request) => {
  let body = '';
  for await (const chunk of request) body += chunk;
  if (body.length > 10000) throw new Error('Payload too large');
  return body ? JSON.parse(body) : {};
};
const clientKey = (request) => request.socket.remoteAddress || 'unknown';
const allowRequest = (request) => {
  const key = clientKey(request);
  const now = Date.now();
  const recent = (requestWindows.get(key) || []).filter((time) => now - time < requestWindowMs);
  if (recent.length >= maxRequestsPerWindow) return false;
  recent.push(now);
  requestWindows.set(key, recent);
  return true;
};
const secret = () => process.env.SESSION_SECRET;
const hashOtp = (otp, challengeId) => crypto.createHmac('sha256', secret()).update(`${challengeId}:${otp}`).digest('hex');
const sign = (value) => crypto.createHmac('sha256', secret()).update(value).digest('hex');
const validSession = (request) => {
  if (!secret()) return null;
  const raw = parseCookies(request.headers.cookie).get('nextake_admin');
  if (!raw) return null;
  const [id, signature] = raw.split('.');
  const expected = sign(id || '');
  if (!id || !signature || signature.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
  const session = sessions.get(id);
  if (!session || session.expiresAt <= Date.now()) {
    sessions.delete(id);
    return null;
  }
  session.expiresAt = Date.now() + inactivityTimeoutMs;
  return session;
};
const missingEmailConfig = () => ['RESEND_API_KEY', 'RESEND_FROM_EMAIL', 'ADMIN_EMAIL'].filter((key) => !process.env[key]);
const otpEmailTemplates = [
  (otp) => `
    <div style="margin:0;background:#f4f7f8;padding:40px 16px;font-family:Arial,sans-serif;color:#071a2b">
      <div style="max-width:520px;margin:auto;background:#ffffff;border:1px solid #dce5e7;border-radius:18px;overflow:hidden">
        <div style="background:#071a2b;padding:24px 28px;color:#ffffff;font-size:20px;font-weight:700">Next<span style="color:#7fffd4">Edit</span> Admin</div>
        <div style="padding:34px 28px;text-align:center">
          <p style="margin:0 0 8px;color:#6b7b83;font-size:12px;text-transform:uppercase;letter-spacing:2px">Secure sign-in code</p>
          <h1 style="margin:0 0 24px;font-size:28px">Your OTP is ready</h1>
          <div style="background:#e8fff7;border:2px solid #7fffd4;border-radius:14px;padding:18px;font-size:38px;letter-spacing:10px;font-weight:800;color:#071a2b">${otp}</div>
          <p style="margin:24px 0 0;color:#66757d;font-size:14px;line-height:1.6">Use this code within five minutes to unlock your admin portal.</p>
        </div>
      </div>
    </div>`,
  (otp) => `
    <div style="margin:0;background:#071a2b;padding:44px 16px;font-family:Arial,sans-serif;color:#ffffff">
      <div style="max-width:500px;margin:auto;text-align:center">
        <div style="display:inline-block;border:1px solid #7fffd4;border-radius:999px;padding:8px 14px;color:#7fffd4;font-size:12px;letter-spacing:1px">NEX<span style="color:#ffffff">EDIT</span> ACCESS</div>
        <h1 style="font-size:30px;margin:28px 0 12px">Confirm your identity</h1>
        <p style="color:#b6c5ca;font-size:15px;line-height:1.6">Enter the one-time password below in your administrator portal.</p>
        <div style="margin:28px 0;background:#ffffff;border-radius:16px;padding:22px;color:#071a2b;font-size:40px;letter-spacing:12px;font-weight:800">${otp}</div>
        <p style="color:#8fa2a9;font-size:12px">This code expires in 5 minutes. If you did not request it, you can ignore this email.</p>
      </div>
    </div>`,
  (otp) => `
    <div style="margin:0;background:#fffaf2;padding:32px 16px;font-family:Georgia,serif;color:#202b32">
      <div style="max-width:540px;margin:auto;background:#ffffff;border-top:6px solid #f2b84b;padding:34px 30px;box-shadow:0 8px 24px rgba(7,26,43,.08)">
        <p style="margin:0;color:#b27616;font:700 12px Arial,sans-serif;letter-spacing:2px;text-transform:uppercase">NextEdit security desk</p>
        <h1 style="font-size:30px;font-weight:500;margin:18px 0 12px">Your verification code</h1>
        <p style="font:15px Arial,sans-serif;line-height:1.7;color:#59666b">A sign-in attempt requested a temporary access code for the admin portal.</p>
        <div style="margin:26px 0;padding:20px;text-align:center;background:#fff5dc;border:1px dashed #d89a28;font:700 36px Arial,sans-serif;letter-spacing:9px;color:#593c09">${otp}</div>
        <p style="margin:0;font:13px Arial,sans-serif;color:#78858a">Valid for five minutes and usable once.</p>
      </div>
    </div>`,
  (otp) => `
    <div style="margin:0;background:#eef6ff;padding:36px 16px;font-family:Arial,sans-serif;color:#10283d">
      <div style="max-width:520px;margin:auto;background:#ffffff;border-radius:12px;padding:30px;border:1px solid #cfe0f1">
        <div style="width:42px;height:42px;border-radius:12px;background:#0f5b94;color:#ffffff;text-align:center;line-height:42px;font-size:22px;font-weight:700">N</div>
        <h1 style="margin:24px 0 8px;font-size:25px">Admin access verification</h1>
        <p style="margin:0;color:#607589;line-height:1.6;font-size:14px">Use this temporary code to continue signing in to NextEdit.</p>
        <div style="margin:24px 0;padding:18px 20px;background:#10283d;color:#ffffff;border-radius:10px;text-align:center;font-size:36px;font-weight:800;letter-spacing:8px">${otp}</div>
        <p style="margin:0;color:#607589;font-size:13px">Expires in five minutes. Never share this code.</p>
      </div>
    </div>`,
];

const renderOtpEmail = (otp) => otpEmailTemplates[crypto.randomInt(0, otpEmailTemplates.length)](otp);

const sendOtp = async (otp) => {
  const missing = missingEmailConfig();
  if (missing.length) throw new Error(`Missing configuration: ${missing.join(', ')}`);
  const result = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: process.env.RESEND_FROM_EMAIL,
      to: [process.env.ADMIN_EMAIL],
      subject: 'Your NexTakeAfrica admin OTP',
      html: renderOtpEmail(otp),
    }),
  });
  if (!result.ok) throw new Error('Resend rejected the email');
};

const handleRequest = (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host}`);
  if (url.pathname === '/api/auth/start' && request.method === 'POST') return start(request, response);
  if (url.pathname === '/api/auth/verify' && request.method === 'POST') return verify(request, response);
  if (url.pathname === '/api/auth/logout' && request.method === 'POST') return logout(request, response);
  if (url.pathname === '/api/admin/me' && request.method === 'GET') {
    const session = validSession(request);
    return session ? sendJson(response, 200, { ok: true, username }) : sendJson(response, 401, { ok: false, message: 'Unauthorized.' });
  }
  if (url.pathname === '/api/health') return sendJson(response, 200, { ok: true });
  return serveStatic(url.pathname, response);
};

async function start(request, response) {
  if (!secret()) return sendJson(response, 503, { ok: false, message: 'Authentication is not configured.' });
  let body;
  try { body = await readBody(request); } catch { return sendJson(response, 400, { ok: false, message: 'Invalid request.' }); }
  if (body.username !== username) return sendJson(response, 401, { ok: false, message: 'Invalid username.' });
  if (!allowRequest(request)) return sendJson(response, 429, { ok: false, message: 'Too many authentication requests. Try again later.' }, { 'Retry-After': '900' });
  const oldId = parseCookies(request.headers.cookie).get('nextake_challenge');
  const old = oldId && challenges.get(oldId);
  if (old && Date.now() - old.sentAt < resendCooldownMs) {
    const seconds = Math.ceil((resendCooldownMs - Date.now() + old.sentAt) / 1000);
    return sendJson(response, 429, { ok: false, message: `Please wait ${seconds} seconds before requesting another OTP.` }, { 'Retry-After': String(seconds) });
  }
  if (old && old.requests >= 3) return sendJson(response, 429, { ok: false, message: 'Too many OTP requests. Start again later.' });
  const id = old?.id || crypto.randomUUID();
  const otp = crypto.randomInt(100000, 1000000).toString();
  const challenge = { id, hash: hashOtp(otp, id), sentAt: Date.now(), expiresAt: Date.now() + otpTtlMs, requests: (old?.requests || 0) + 1, attempts: 0 };
  try {
    await sendOtp(otp);
    challenges.set(id, challenge);
    return sendJson(response, 200, { ok: true, message: 'OTP sent.' }, { 'Set-Cookie': `nextake_challenge=${id}; ${cookieOptions(600)}` });
  } catch (error) {
    console.error('[auth] email delivery failed:', error.message);
    return sendJson(response, 503, { ok: false, message: missingEmailConfig().length ? 'OTP email delivery is not configured. Set ADMIN_EMAIL, RESEND_FROM_EMAIL, and RESEND_API_KEY on the server.' : 'Unable to send an OTP right now.' });
  }
}

async function verify(request, response) {
  if (!allowRequest(request)) return sendJson(response, 429, { ok: false, message: 'Too many authentication requests. Try again later.' });
  let body;
  try { body = await readBody(request); } catch { return sendJson(response, 400, { ok: false, message: 'Invalid request.' }); }
  const id = parseCookies(request.headers.cookie).get('nextake_challenge');
  const challenge = id && challenges.get(id);
  const clear = `nextake_challenge=; ${cookieOptions(0)}`;
  if (!challenge || challenge.expiresAt <= Date.now()) {
    if (id) challenges.delete(id);
    return sendJson(response, 401, { ok: false, message: 'OTP is invalid or expired.' }, { 'Set-Cookie': clear });
  }
  if (!/^\d{6}$/.test(String(body.otp || ''))) return sendJson(response, 401, { ok: false, message: 'OTP is invalid.' });
  challenge.attempts += 1;
  const actual = hashOtp(String(body.otp), id);
  const valid = crypto.timingSafeEqual(Buffer.from(actual), Buffer.from(challenge.hash));
  if (!valid) {
    if (challenge.attempts >= maxAttempts) {
      challenges.delete(id);
      return sendJson(response, 429, { ok: false, message: 'Too many failed attempts. Request a new OTP.' }, { 'Set-Cookie': clear });
    }
    return sendJson(response, 401, { ok: false, message: 'OTP is invalid.' });
  }
  challenges.delete(id);
  const sessionId = crypto.randomUUID();
  sessions.set(sessionId, { expiresAt: Date.now() + inactivityTimeoutMs });
  const value = `${sessionId}.${sign(sessionId)}`;
  return sendJson(response, 200, { ok: true }, { 'Set-Cookie': [`nextake_challenge=; ${cookieOptions(0)}`, `nextake_admin=${value}; ${cookieOptions(86400)}`] });
}

async function logout(request, response) {
  const raw = parseCookies(request.headers.cookie).get('nextake_admin');
  if (raw) sessions.delete(raw.split('.')[0]);
  return sendJson(response, 200, { ok: true }, { 'Set-Cookie': `nextake_admin=; ${cookieOptions(0)}` });
}

function serveStatic(requestPath, response) {
  const dist = path.join(projectRoot, 'dist');
  const requested = requestPath === '/' ? '/index.html' : requestPath;
  const file = path.resolve(dist, `.${requested}`);
  if (!file.startsWith(dist) || !fs.existsSync(file) || !fs.statSync(file).isFile()) return fs.existsSync(path.join(dist, 'index.html')) ? response.end(fs.readFileSync(path.join(dist, 'index.html'))) : sendJson(response, 404, { ok: false, message: 'Not found.' });
  response.end(fs.readFileSync(file));
}

const server = createServer(handleRequest);
server.listen(port, '0.0.0.0', () => console.log(`NexTake-Admin server listening on http://localhost:${port}`));
