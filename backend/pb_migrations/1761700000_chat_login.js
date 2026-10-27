/// <reference path="../pb_data/types.d.ts" />
// Played inside the Lazybutts Chat: every player is a Chat account. A profile now belongs to
// one Chat user (chat_id) and is reached only through the /api/serpent/* routes in pb_hooks,
// which ask Chat who the session cookie belongs to. The generic records API is closed to
// everyone but the PocketBase superuser, so nobody can read or overwrite another player's save.
migrate(
  (app) => {
    const c = app.findCollectionByNameOrId('profiles');
    c.listRule = null;
    c.viewRule = null;
    c.createRule = null;
    c.updateRule = null;
    c.deleteRule = null;
    c.fields.add(new NumberField({ name: 'chat_id', onlyInt: true, min: 1 }));
    const name = c.fields.getByName('name');
    name.max = 40; // Chat display names, not hand-typed nicknames
    // Names come from Chat now and may repeat; the Chat account is the identity.
    c.indexes = ['CREATE UNIQUE INDEX idx_profiles_chat ON profiles (chat_id) WHERE chat_id > 0'];
    app.save(c);
  },
  (app) => {
    const c = app.findCollectionByNameOrId('profiles');
    c.fields.removeByName('chat_id');
    c.listRule = '';
    c.viewRule = '';
    c.createRule = '';
    c.updateRule = '';
    c.fields.getByName('name').max = 20;
    c.indexes = ['CREATE UNIQUE INDEX idx_profiles_name ON profiles (name)'];
    app.save(c);
  },
);
