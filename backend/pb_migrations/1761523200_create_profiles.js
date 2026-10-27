/// <reference path="../pb_data/types.d.ts" />
// One record per player: name + save JSON (see src/meta/save.ts). Trusted LAN, so no auth:
// anyone may list, view, create and update; only the admin may delete.
migrate(
  (app) => {
    const collection = new Collection({
      type: 'base',
      name: 'profiles',
      listRule: '',
      viewRule: '',
      createRule: '',
      updateRule: '',
      deleteRule: null,
      fields: [
        { type: 'text', name: 'name', required: true, min: 1, max: 20 },
        { type: 'json', name: 'save', maxSize: 200000 },
        { type: 'json', name: 'save_backup', maxSize: 200000 },
        { type: 'autodate', name: 'created', onCreate: true },
        { type: 'autodate', name: 'updated', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE UNIQUE INDEX idx_profiles_name ON profiles (name)'],
    });
    app.save(collection);
  },
  (app) => {
    app.delete(app.findCollectionByNameOrId('profiles'));
  },
);
