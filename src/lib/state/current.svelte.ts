// The exercise being practised, shared between the screen that starts it and the run screen.

import type { Exercise } from '../train/exercise';
import { go } from '../app/router.svelte';

export const current = $state<{ ex: Exercise | null }>({ ex: null });

export function start(ex: Exercise) {
  current.ex = ex;
  go('train');
}
