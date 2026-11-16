import { siteResponse } from './content.mjs';

const purchaseIntents = new Set(['yes', 'maybe', 'no']);
const productChoices = new Set(['gps', 'bluetooth', 'neither']);
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const voterIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const sourcePattern = /^[a-z0-9_-]{1,32}$/;
const insertLegacySignup = `
  INSERT INTO waitlist_signups (email, intent) VALUES (?, ?)
  ON CONFLICT(email) DO NOTHING
`;
// A repeat sign-up keeps the source it first came from.
const saveProductSignup = `
  INSERT INTO waitlist_signups (email, intent, product, compared_at, source)
  VALUES (?, 'yes', ?, CURRENT_TIMESTAMP, ?)
  ON CONFLICT(email) DO UPDATE SET
    intent = excluded.intent,
    product = excluded.product,
    compared_at = excluded.compared_at
  WHERE waitlist_signups.product != excluded.product
     OR waitlist_signups.compared_at IS NULL
`;
const insertNeitherVote = `
  INSERT INTO waitlist_neither_votes (voter_id, source) VALUES (?, ?)
  ON CONFLICT(voter_id) DO NOTHING
`;
const removeNeitherVote = 'DELETE FROM waitlist_neither_votes WHERE voter_id = ?';

// The same statements without the source column, used only until migration 0002 has run.
const saveProductSignupWithoutSource = `
  INSERT INTO waitlist_signups (email, intent, product, compared_at)
  VALUES (?, 'yes', ?, CURRENT_TIMESTAMP)
  ON CONFLICT(email) DO UPDATE SET
    intent = excluded.intent,
    product = excluded.product,
    compared_at = excluded.compared_at
  WHERE waitlist_signups.product != excluded.product
     OR waitlist_signups.compared_at IS NULL
`;
const insertNeitherVoteWithoutSource = `
  INSERT INTO waitlist_neither_votes (voter_id) VALUES (?)
  ON CONFLICT(voter_id) DO NOTHING
`;

function readSource(value) {
  const source = typeof value === 'string' ? value.trim().toLowerCase() : '';
  return sourcePattern.test(source) ? source : 'direct';
}

async function saveChoice(database, { choice, email, voterId, source }, withSource) {
  if (choice === 'neither') {
    const statement = withSource
      ? database.prepare(insertNeitherVote).bind(voterId, source)
      : database.prepare(insertNeitherVoteWithoutSource).bind(voterId);
    const result = await statement.run();
    return result.success;
  }
  const signup = withSource
    ? database.prepare(saveProductSignup).bind(email, choice, source)
    : database.prepare(saveProductSignupWithoutSource).bind(email, choice);
  const results = await database.batch([signup, database.prepare(removeNeitherVote).bind(voterId)]);
  return results.every((result) => result.success);
}

function isMissingSourceColumn(error) {
  return /source/i.test(String(error?.message ?? error));
}

function json(body, status = 200, headers = {}) {
  return Response.json(body, {
    status,
    headers: { 'cache-control': 'no-store', ...headers },
  });
}

function errorResponse(error, status = 400, headers) {
  return json({ ok: false, error }, status, headers);
}

async function signUp(request, database) {
  if (request.method !== 'POST') {
    return errorResponse('Use the waitlist form to sign up.', 405, { allow: 'POST' });
  }

  const contentType = request.headers.get('content-type')?.split(';', 1)[0].trim().toLowerCase();
  if (contentType !== 'application/json') {
    return errorResponse('Use the waitlist form to submit your email address.', 415);
  }

  const body = await request.json().catch(() => null);
  const choice = body?.choice;
  if (choice !== undefined && !productChoices.has(choice)) {
    return errorResponse('Choose a tracker or select neither.');
  }

  const voterId = typeof body?.voterId === 'string' ? body.voterId.trim().toLowerCase() : '';
  if (choice !== undefined && !voterIdPattern.test(voterId)) {
    return errorResponse('Refresh the page and try choosing again.');
  }

  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
  if (choice !== 'neither' && (email.length > 254 || !emailPattern.test(email))) {
    return errorResponse('Enter a valid email address.');
  }

  const intent = body?.intent ?? null;
  if (choice === undefined && intent !== null && !purchaseIntents.has(intent)) {
    return errorResponse('Choose a valid purchase intent.');
  }

  // A bad or missing tag never blocks a sign-up: it is saved as "direct".
  const source = readSource(body?.source);

  try {
    if (choice !== undefined) {
      const answer = { choice, email, voterId, source };
      let saved;
      try {
        saved = await saveChoice(database, answer, true);
      } catch (error) {
        if (!isMissingSourceColumn(error)) throw error;
        saved = await saveChoice(database, answer, false);
      }
      if (saved) return json({ ok: true });
    } else {
      const result = await database.prepare(insertLegacySignup).bind(email, intent).run();
      if (result.success) return json({ ok: true });
    }
  } catch {
    // Keep storage details and submitted email addresses out of the response.
  }

  return errorResponse('We couldn’t save your response. Please try again.', 503);
}

export default {
  fetch(request, env) {
    const { pathname } = new URL(request.url);
    if (pathname === '/api/waitlist') return signUp(request, env.DB);
    if (pathname.startsWith('/api/')) return errorResponse('Not found.', 404);
    return siteResponse(request);
  },
};
