import { relations } from "drizzle-orm";
import { boolean, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
    id: uuid("id").primaryKey().defaultRandom().notNull(),
    username: text("username").notNull().unique(),
    email: text("email").notNull().unique(),
    password: text("password").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
        .defaultNow()
        .notNull(),
});

export const devices = pgTable("devices", {
    id: uuid("id").primaryKey().defaultRandom().notNull(),
    userId: uuid("user_id")
        .notNull()
        .references(() => users.id),
    deviceIdentifier: text("device_identifier").notNull(),
    userAgent: text("user_agent"),
    ipAddress: text("ip_address"),
    location: text("location"),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true })
        .defaultNow()
        .notNull(),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
        .defaultNow()
        .notNull(),
    updateAt: timestamp("updated_at", { withTimezone: true })
        .defaultNow()
        .notNull()
        .$onUpdate(() => new Date()),
});

export const sessions = pgTable("sessions", {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
    deviceId: uuid("device_id")
        .notNull()
        .references(() => devices.id, { onDelete: "cascade" }),
    token: text("token"),
    expiresAt: timestamp("expires_at").notNull(),
    isValid: boolean("is_valid").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
        .defaultNow()
        .notNull(),
});

export const UserRelations = relations(users, ({ many }) => ({
    devices: many(devices),
    sessions: many(sessions),
}));

export const devicesRelations = relations(devices, ({ one }) => ({
    user: one(users, {
        fields: [devices.userId],
        references: [users.id],
    }),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
    user: one(users, {
        fields: [sessions.userId],
        references: [users.id],
    }),
    device: one(devices, {
        fields: [sessions.deviceId],
        references: [devices.id],
    }),
}));

export const table = {
    users,
    devices,
} as const;

export type Table = typeof table;
