// Side-effect module: imported first in main.tsx so every other module sees the
// America/Chicago clock. See ./app-timezone.ts.
import { installAppClock } from './app-timezone';

installAppClock();
