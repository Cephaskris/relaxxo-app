/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as admin from "../admin.js";
import type * as auth from "../auth.js";
import type * as crons from "../crons.js";
import type * as feedback from "../feedback.js";
import type * as hotels from "../hotels.js";
import type * as http from "../http.js";
import type * as lib_helpers from "../lib/helpers.js";
import type * as messages from "../messages.js";
import type * as notifications from "../notifications.js";
import type * as payments from "../payments.js";
import type * as places from "../places.js";
import type * as rooms from "../rooms.js";
import type * as services from "../services.js";
import type * as settings from "../settings.js";
import type * as storage from "../storage.js";
import type * as therapists from "../therapists.js";
import type * as unlocks from "../unlocks.js";
import type * as users from "../users.js";
import type * as wallet from "../wallet.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  admin: typeof admin;
  auth: typeof auth;
  crons: typeof crons;
  feedback: typeof feedback;
  hotels: typeof hotels;
  http: typeof http;
  "lib/helpers": typeof lib_helpers;
  messages: typeof messages;
  notifications: typeof notifications;
  payments: typeof payments;
  places: typeof places;
  rooms: typeof rooms;
  services: typeof services;
  settings: typeof settings;
  storage: typeof storage;
  therapists: typeof therapists;
  unlocks: typeof unlocks;
  users: typeof users;
  wallet: typeof wallet;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
