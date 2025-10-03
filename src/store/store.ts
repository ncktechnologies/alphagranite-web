import { configureStore } from "@reduxjs/toolkit";
import { authApi } from "./api/auth";
import { churchesApi } from './api/churches';


export const store = configureStore({
    reducer: {
        [authApi.reducerPath]: authApi.reducer,
        [churchesApi.reducerPath]: churchesApi.reducer,
    },
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware().concat(
            authApi.middleware,
            churchesApi.middleware,
        ),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch; 