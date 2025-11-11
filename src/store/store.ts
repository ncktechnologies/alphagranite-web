import { configureStore } from "@reduxjs/toolkit";
import { authApi } from "./api/auth";
import { departmentApi } from "./api/department";
import { employeeApi } from "./api/employee";
import { roleApi } from "./api/role";
import { actionMenuApi } from "./api/actionMenu";


export const store = configureStore({
    reducer: {
        [authApi.reducerPath]: authApi.reducer,
        [departmentApi.reducerPath]: departmentApi.reducer,
        [employeeApi.reducerPath]: employeeApi.reducer,
        [roleApi.reducerPath]: roleApi.reducer,
        [actionMenuApi.reducerPath]: actionMenuApi.reducer,
    },
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware().concat(
            authApi.middleware,
            departmentApi.middleware,
            employeeApi.middleware,
            roleApi.middleware,
            actionMenuApi.middleware,
        ),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch; 