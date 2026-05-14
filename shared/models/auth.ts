import { users } from "../schema";
export { users, sessions } from "../schema";
export type { User } from "../schema";

export type UpsertUser = typeof users.$inferInsert;
