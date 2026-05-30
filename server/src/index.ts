import './env.js';
import { assertBootEnv } from './env.js';
import { createApp } from './app.js';

assertBootEnv();

const port = Number(process.env.PORT || 4000);
const app = createApp();
app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`VOIDBORN server listening on :${port}  (curl :${port}/health)`);
});
