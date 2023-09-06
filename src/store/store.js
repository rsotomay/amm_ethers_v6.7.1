import { configureStore } from "@reduxjs/toolkit";

import provider from "./reducers/provider";
import tokens from "./reducers/tokens";
import amm from "./reducers/amm";

export const store = configureStore({
  reducer: {
    provider,
    tokens,
    amm,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({ serializableCheck: false }),
});

// {
//   // Ignore these field paths in all actions and state
//   ignoredActionPaths: [
//     // "payload.connection",
//     "payload",
//     // "amm.swapsLoaded",
//     "payload.swaps",
//   ],
//   ignoredPaths: [
//     "provider.connection",
//     "amm.swaps",
//     "tokens.contracts.0",
//     "tokens.contracts.1",
//     "amm.contract",
//   ],
// },
