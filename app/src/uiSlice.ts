import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { CHALLENGES, type Challenge } from "./contracts";
import type { RootState } from "./store";

// Caveman-simple UI state: which challenge is picked, and a counter the Docket
// watches to know when to reload. That's it — chain state stays in wagmi/react-query.
interface UiState {
  selectedKey: string; // CHALLENGES[].key of the active examination
  refreshNonce: number; // bump this to force the Docket to re-fetch
}

const initialState: UiState = {
  selectedKey: CHALLENGES[0].key,
  refreshNonce: 0,
};

const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    selectChallenge(state, action: PayloadAction<string>) {
      state.selectedKey = action.payload;
    },
    triggerRefresh(state) {
      state.refreshNonce += 1;
    },
  },
});

export const { selectChallenge, triggerRefresh } = uiSlice.actions;
export default uiSlice.reducer;

// Selectors — derive the full Challenge object from the stored key.
export const selectSelectedKey = (s: RootState) => s.ui.selectedKey;
export const selectRefreshNonce = (s: RootState) => s.ui.refreshNonce;
export const selectChallengeObj = (s: RootState): Challenge =>
  CHALLENGES.find((c) => c.key === s.ui.selectedKey) ?? CHALLENGES[0];
