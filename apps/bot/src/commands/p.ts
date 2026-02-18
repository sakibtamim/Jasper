import { createAlias } from '../utils/command-alias.js';
import playCommand from './play.js';

export default createAlias('p', 'Alias for /play', playCommand);
