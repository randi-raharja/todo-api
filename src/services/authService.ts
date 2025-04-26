import jwt from "@elysiajs/jwt";
import Elysia, { t } from "elysia";
import db from "../db";
import { devices, sessions, users } from "../db/schema";
import { and, eq, or } from "drizzle-orm";
import {
    getClientIP,
    getDeviceType,
    getGeoLocation,
} from "../libs/deviceUtils";
import { v4 as uuidV4 } from "uuid";

interface UsersType {
    username: string;
    email: string;
    password: string;
}

export const AuthService = new Elysia({ prefix: "auth" })
    .use(
        jwt({
            name: "jwt",
            secret: Bun.env.JWT_SECRET!,
            exp: "7d",
        })
    )

    // Register
    .post(
        "/register",
        async ({ body }: { body: UsersType }) => {
            const { username, email, password } = body;

            const existingUser = await db
                .select()
                .from(users)
                .where(or(eq(users.username, username), eq(users.email, email)))
                .limit(1);

            if (existingUser.length > 0) {
                return { message: "User already exists" };
            }

            const passwordHash = await Bun.password.hash(password);

            const [user] = await db
                .insert(users)
                .values({
                    username,
                    email,
                    password: passwordHash,
                })
                .returning();

            return {
                userId: user.id,
            };
        },
        {
            body: t.Object({
                username: t.String(),
                email: t.String({ format: "email" }),
                password: t.String({ minLength: 8 }),
            }),
        }
    )

    // Login
    .post(
        "/login",
        async ({
            body,
            request,
            jwt,
        }: {
            body: UsersType;
            request: Request;
            jwt: any;
        }) => {
            const { email, password } = body;

            const [user] = await db
                .select()
                .from(users)
                .where(eq(users.email, email))
                .limit(1);

            if (!user) {
                return { message: "Invalid credentials" };
            }

            const passValid = await Bun.password.verify(
                password,
                user.password
            );
            if (!passValid) {
                return { message: "Invalid credentials" };
            }

            const userAgent = request.headers.get("user-agent") || "unknown";
            const clientIP = await getClientIP();
            const deviceType = getDeviceType(userAgent);
            const geoLocation = await getGeoLocation(clientIP);
            const saveLocaltion = `${geoLocation.regionName}, ${geoLocation.country}`;

            let deviceId;
            const [existingDevice] = await db
                .select()
                .from(devices)
                .where(
                    and(
                        eq(devices.userId, user.id),
                        eq(devices.userAgent, userAgent)
                    )
                )
                .limit(1);

            if (existingDevice) {
                await db
                    .update(devices)
                    .set({
                        lastLoginAt: new Date(),
                        isActive: true,
                    })
                    .where(eq(devices.id, existingDevice.id));

                deviceId = existingDevice.id;
            } else {
                const [newDevices] = await db
                    .insert(devices)
                    .values({
                        userId: user.id,
                        deviceIdentifier: deviceType,
                        userAgent: userAgent,
                        ipAddress: clientIP,
                        location: saveLocaltion,
                    })
                    .returning();
                deviceId = newDevices.id;
            }

            const checkDeviceId = await db
                .select()
                .from(sessions)
                .where(eq(sessions.deviceId, deviceId))
                .limit(1);

            if (checkDeviceId.length > 0) {
                await db
                    .delete(sessions)
                    .where(eq(sessions.deviceId, deviceId));
            }

            const sessionId = uuidV4();
            const expiredAt = new Date();
            expiredAt.setDate(expiredAt.getDate() + 7);

            const token = await jwt.sign({
                sessionId,
                userId: user.id,
                deviceId,
            });

            await db.insert(sessions).values({
                id: sessionId,
                userId: user.id,
                deviceId,
                token,
                expiresAt: expiredAt,
            });

            return {
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                },
            };
        },
        {
            body: t.Object({
                email: t.String({ format: "email" }),
                password: t.String(),
            }),
        }
    )

    .post("/logout", async ({ jwt, request }) => {
        const authHeader = request.headers.get("Authorization");
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return { message: "Unauthorized" };
        }

        const token = authHeader.split(" ")[1];

        let payload;
        try {
            payload = await jwt.verify(token);
        } catch (error) {
            return { message: "Invalid token" };
        }

        if (!payload || !payload.sessionId) {
            return { success: false, message: "Invalid token" };
        }

        const result = await db
            .update(sessions)
            .set({ isValid: false })
            .where(
                and(
                    eq(sessions.id, payload.sessionId as string),
                    eq(sessions.token, token)
                )
            );

        if (result === 0) {
            return {
                message:
                    "Logout failed. Session not found or already invalidated.",
            };
        }

        return {
            message: "Logout successful",
        };
    })

    .get("/test", async ({ request }) => {
        const userAgent = request.headers.get("user-agent") || "unknown";
        const clientIP = await getClientIP();
        const deviceType = getDeviceType(userAgent);
        const geoLocation = await getGeoLocation(clientIP);
        const saveLocation = {
            region: geoLocation.regionName,
            country: geoLocation.country,
        };

        return {
            userAgent,
            clientIP,
            deviceType,
            geoLocation,
            saveLocation,
        };
    });

export default AuthService;
