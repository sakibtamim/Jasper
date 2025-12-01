import playCommand from "./play.js";
import { createAlias } from "../utils/command-alias.js";

export default createAlias("p", "Alias for /play", playCommand);
