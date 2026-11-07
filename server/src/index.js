import { createApp } from "./app.js";
import { config } from "./config.js";
import { logger } from "./lib/logger.js";

createApp().listen(config.port, () => {
	logger.info({ port: config.port, model: config.defaultModel }, "server listening");
});
