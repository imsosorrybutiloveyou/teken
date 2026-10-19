import { defineConfig } from "vite";
import { createLobby } from "./server/lobby.js";
export default defineConfig({
  plugins: [
    {
      name: "axis-dev-matchmaking",
      configureServer(server) {
        const lobby = createLobby();
        server.middlewares.use((req, res, next) => {
          lobby
            .handler(req, res)
            .then((handled) => {
              if (!handled) next();
            })
            .catch(next);
        });
        server.httpServer?.on("close", () => lobby.close());
      },
    },
  ],
});
