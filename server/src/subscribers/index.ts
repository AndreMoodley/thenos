import { register } from '../lib/eventBus.js';
import { loggerSubscriber } from './logger.js';
import { sagaSubscriber } from './saga.js';
import { bondSubscriber } from './bond.js';
import { anomalySubscriber } from './anomaly.js';

let registered = false;

/** Register all event subscribers once. Called by the worker (and could be called at app boot). */
export function registerAll(): void {
  if (registered) return;
  register(loggerSubscriber);
  register(sagaSubscriber);
  register(bondSubscriber);
  register(anomalySubscriber);
  registered = true;
}
