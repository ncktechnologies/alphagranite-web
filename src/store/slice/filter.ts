// filterSlice.ts
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface FilterState {
  statuses: {
    [tableId: string]: string;
  };
}

const initialState: FilterState = {
  statuses: {},
};

const filterSlice = createSlice({
  name: "filter",
  initialState,
  reducers: {
    setStatusFilter: (state, action: PayloadAction<{ tableId: string; status: string }>) => {
      const { tableId, status } = action.payload;
      state.statuses[tableId] = status;
    },
  }
});

export const { setStatusFilter } = filterSlice.actions;
export const filterReducer = filterSlice.reducer;

