import swagger from "@elysiajs/swagger";
import { Elysia } from "elysia";
import AuthService from "./services/authService";

const app = new Elysia()
    .get("/", () => "Hello Elysia")
    .use(swagger())
    .use(AuthService)
    .listen(3000);

console.log(
    `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
);
