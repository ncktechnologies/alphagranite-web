import { combineReducers, configureStore } from "@reduxjs/toolkit";
import storage from "redux-persist/lib/storage";
import { FLUSH, PAUSE, PERSIST, persistReducer, persistStore, PURGE, REGISTER, REHYDRATE } from "redux-persist";
// import layout from "./layout";
// import { layoutReducer } from "./layout";
import { userSliceReducer, paginationReducer } from "./slice";
import { authApi } from "./api";
import { setupListeners } from "@reduxjs/toolkit/query";
import userReducer from './slice/user';
import { departmentApi } from "./api/department";
import { employeeApi } from "./api/employee";
import { roleApi } from "./api/role";
import { actionMenuApi } from "./api/actionMenu";
import { jobApi } from "./api/job";
import { workstationApi } from "./api/workstation";
import { shopCutPlanningApi } from "./api/shopCutPlanning";


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
    [departmentApi.reducerPath]: departmentApi.reducer,
    [employeeApi.reducerPath]: employeeApi.reducer,
    [roleApi.reducerPath]: roleApi.reducer,
    [actionMenuApi.reducerPath]: actionMenuApi.reducer,
    [jobApi.reducerPath]: jobApi.reducer,
    [workstationApi.reducerPath]: workstationApi.reducer,
    [shopCutPlanningApi.reducerPath]: shopCutPlanningApi.reducer,
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
                departmentApi.middleware,
                employeeApi.middleware,
                roleApi.middleware,
                actionMenuApi.middleware,
                jobApi.middleware,
                workstationApi.middleware,
                shopCutPlanningApi.middleware,
            ),

});

setupListeners(store.dispatch);

const persistor = persistStore(store);

export { store, persistor }