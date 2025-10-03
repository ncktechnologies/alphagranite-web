import { combineReducers, configureStore } from "@reduxjs/toolkit";
import storage from "redux-persist/lib/storage";
import { FLUSH, PAUSE, PERSIST, persistReducer, persistStore, PURGE, REGISTER, REHYDRATE } from "redux-persist";
// import layout from "./layout";
// import { layoutReducer } from "./layout";
import { userSliceReducer, paginationReducer } from "./slice";
import { authApi } from "./api";
import { setupListeners } from "@reduxjs/toolkit/query";
import userReducer from './slice/user';
import { adminApi } from "./api/admin";
import { financeApi } from "./api/financial";

const persistConfig = {
    key: "root",
    version: 1,
    storage,
    whitelist: ["user",],
};

const rootReducer = combineReducers({
    user: userReducer,
    pagination: paginationReducer,
    [authApi.reducerPath]: authApi.reducer,
    [adminApi.reducerPath]: adminApi.reducer,
    [financeApi.reducerPath]: financeApi.reducer,


});

export type RootState = ReturnType<typeof rootReducer>;

// Create persisted reducer
const persistedReducer = persistReducer(persistConfig, rootReducer);

const store = configureStore({
    reducer: persistedReducer,
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
            serializableCheck: {
                ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
            }
        })
            .concat(
                authApi.middleware,
                adminApi.middleware,
                financeApi.middleware
            ),

});

setupListeners(store.dispatch);

const persistor = persistStore(store);

export { store, persistor }