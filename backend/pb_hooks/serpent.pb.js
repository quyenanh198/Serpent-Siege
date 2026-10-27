// The game's only API. The player is whoever the Chat session cookie says they are; each
// player reads and writes only their own save.

// GET /api/serpent/me -> { id, name } of the profile tied to this Chat account (created on first visit).
routerAdd('GET', '/api/serpent/me', (e) => {
  const chat = require(`${__hooks}/chat_lib.js`);
  const rec = chat.requireProfile(e);
  if (!rec) return;
  return e.json(200, { id: rec.id, name: rec.getString('name') });
});

// GET /api/serpent/save -> { save, save_backup }
routerAdd('GET', '/api/serpent/save', (e) => {
  const chat = require(`${__hooks}/chat_lib.js`);
  const rec = chat.requireProfile(e);
  if (!rec) return;
  return e.json(200, { save: rec.get('save'), save_backup: rec.get('save_backup') });
});

// PATCH /api/serpent/save { save, save_backup? } -> { ok: true }
routerAdd('PATCH', '/api/serpent/save', (e) => {
  const chat = require(`${__hooks}/chat_lib.js`);
  const rec = chat.requireProfile(e);
  if (!rec) return;
  const body = e.requestInfo().body || {};
  // Same limit as the profiles.save JSON field.
  const fit = (v) => v && typeof v === 'object' && !Array.isArray(v) && JSON.stringify(v).length <= 200000;
  if (!fit(body.save)) return e.json(400, { error: 'bad_save' });
  rec.set('save', body.save);
  if (body.save_backup !== undefined) rec.set('save_backup', body.save_backup);
  $app.save(rec);
  return e.json(200, { ok: true });
});
