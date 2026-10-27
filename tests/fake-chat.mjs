// A stand-in for Lazybutts Chat's GET /api/me, for the PocketBase integration test:
// the session cookie "alice" is user 1, "bob" is user 2, anything else is not signed in.
import { createServer } from 'node:http';

const users = {
  alice: { id: 1, username: 'alice', display_name: 'Alice' },
  bob: { id: 2, username: 'bob', display_name: '' },
};
const port = Number(process.argv[2] || 8082);
createServer((req, res) => {
  const session = /(?:^|;\s*)lb_session=([^;]+)/.exec(req.headers.cookie || '')?.[1];
  const user = req.url === '/api/me' ? users[session] : undefined;
  res.writeHead(user ? 200 : 401, { 'content-type': 'application/json' });
  res.end(JSON.stringify(user ?? { error: 'unauthorized' }));
}).listen(port, '127.0.0.1');
