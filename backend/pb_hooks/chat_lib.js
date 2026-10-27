// Shared by the handlers in serpent.pb.js. PocketBase runs each handler in its own VM, so
// they load this module with require() instead of sharing top-level functions.

const COOKIE = 'lb_session';
const CACHE_MS = 10000;

/** Only the Chat session cookie is forwarded to Chat, never the others. */
function sessionCookie(header) {
  for (const part of String(header || '').split(';')) {
    const item = part.trim();
    if (item.startsWith(COOKIE + '=') && item.length > COOKIE.length + 1) return item;
  }
  return null;
}

/**
 * Who is playing: asks Chat's GET /api/me with the visitor's session cookie. Answers are
 * cached for a few seconds so saving during play does not hammer Chat. Returns
 * { id, name } or null (not logged in, or Chat unreachable).
 */
function identity(e) {
  const cookie = sessionCookie(e.request.header.get('Cookie'));
  if (!cookie) return null;
  const store = $app.store();
  const key = 'chat-me:' + cookie;
  const hit = store.get(key);
  if (hit && hit.until > Date.now()) return hit.who;

  const root = ($os.getenv('CHAT_API_URL') || 'http://chat:8082').replace(/\/+$/, '');
  let who = null;
  try {
    const res = $http.send({ url: root + '/api/me', method: 'GET', headers: { Cookie: cookie }, timeout: 5 });
    const me = res.statusCode === 200 ? res.json : null;
    if (me && Number.isInteger(me.id) && me.id > 0) {
      let name =
        typeof me.display_name === 'string' && me.display_name.trim() ? me.display_name : me.username;
      name =
        String(name || 'Player')
          .trim()
          .slice(0, 24) || 'Player';
      who = { id: me.id, name: name };
    }
  } catch (err) {
    return null; // Chat unreachable: treat as not logged in, do not cache
  }
  if (store.length() > 1000) store.reset();
  store.set(key, { who: who, until: Date.now() + CACHE_MS });
  return who;
}

/** The profile record of a Chat user, created on first visit; its name follows Chat. */
function profileFor(who) {
  let rec;
  try {
    rec = $app.findFirstRecordByFilter('profiles', 'chat_id = {:id}', { id: who.id });
  } catch (err) {
    rec = null; // not found
  }
  if (!rec) {
    rec = new Record($app.findCollectionByNameOrId('profiles'));
    rec.set('chat_id', who.id);
    rec.set('name', who.name);
    try {
      $app.save(rec);
    } catch (err) {
      // Two first requests at once: the other one created it.
      rec = $app.findFirstRecordByFilter('profiles', 'chat_id = {:id}', { id: who.id });
    }
  } else if (rec.getString('name') !== who.name) {
    rec.set('name', who.name);
    $app.save(rec);
  }
  return rec;
}

/** 401 unless the visitor is logged in to Chat; otherwise their profile record. */
function requireProfile(e) {
  const who = identity(e);
  if (!who) {
    e.json(401, { error: 'not_logged_in' });
    return null;
  }
  return profileFor(who);
}

module.exports = { sessionCookie, identity, profileFor, requireProfile };
