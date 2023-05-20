import { secureRndstr } from '@/misc/secure-rndstr.js';

// eslint-disable-next-line import/no-default-export
export default (): string => secureRndstr(16, true);
