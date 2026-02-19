import { createAlias } from '../utils/command-alias.js';
import playlistCommand from './playlist.js';

export default createAlias('pl', 'Alias for /playlist', playlistCommand);
