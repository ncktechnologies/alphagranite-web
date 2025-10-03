// src/store/slice/paginationSlice.ts
import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export interface PaginationValues {
  currentPage: number;
  perPage: number;
  totalPages: number;
}

interface TablePaginationState {
  [tableKey: string]: PaginationValues;
}

const initialPagination: PaginationValues = {
  currentPage: 1,
  perPage: 20,
  totalPages: 1,
};

const initialState: TablePaginationState = {};

const paginationSlice = createSlice({
  name: "pagination",
  initialState,
  reducers: {
    setPagination: (
      state,
      action: PayloadAction<{
        table: string;
        currentPage: number;
        perPage: number;
        totalPages: number;
      }>
    ) => {
      state[action.payload.table] = {
        currentPage: action.payload.currentPage,
        perPage: action.payload.perPage,
        totalPages: action.payload.totalPages,
      };
    },
    updatePage: (
      state,
      action: PayloadAction<{ table: string; currentPage: number }>
    ) => {
      if (!state[action.payload.table]) {
        state[action.payload.table] = { ...initialPagination };
      }
      state[action.payload.table].currentPage = action.payload.currentPage;
    },
    updatePerPage: (
      state,
      action: PayloadAction<{ table: string; perPage: number }>
    ) => {
      if (!state[action.payload.table]) {
        state[action.payload.table] = { ...initialPagination };
      }
      state[action.payload.table].perPage = action.payload.perPage;
    },
  },
});

export const { setPagination, updatePage, updatePerPage } = paginationSlice.actions;
export const paginationReducer = paginationSlice.reducer;
export const defaultPagination = initialPagination;
