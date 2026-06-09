import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { CHALLENGES, type Challenge } from "./contracts";
import type { RootState } from "./store";

// Caveman-simple UI state: which challenge is picked, the user-created (community) challenges read
// from chain, and a counter the Docket watches to know when to reload. Curated challenges stay static
// in CHALLENGES; community ones live here because they're discovered on-chain at runtime.
interface UiState {
  selectedKey: string; // CHALLENGES[].key (or a community challenge id) of the active examination
  refreshNonce: number; // bump this to force the Docket to re-fetch
  community: Challenge[]; // user-created examiners enumerated from the judge contract
}

const initialState: UiState = {
  selectedKey: CHALLENGES[0].key,
  refreshNonce: 0,
  community: [],
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
    setCommunity(state, action: PayloadAction<Challenge[]>) {
      state.community = action.payload;
    },
    addCommunity(state, action: PayloadAction<Challenge>) {
      // optimistic insert after a createChallenge tx, before the chain re-read lands
      if (!state.community.some((c) => c.key === action.payload.key)) {
        state.community.unshift(action.payload);
      }
    },
  },
});

export const { selectChallenge, triggerRefresh, setCommunity, addCommunity } = uiSlice.actions;
export default uiSlice.reducer;

// Selectors — derive the full Challenge object from the stored key, across curated + community.
export const selectSelectedKey = (s: RootState) => s.ui.selectedKey;
export const selectRefreshNonce = (s: RootState) => s.ui.refreshNonce;
export const selectCommunity = (s: RootState) => s.ui.community;
export const selectChallengeObj = (s: RootState): Challenge =>
  CHALLENGES.find((c) => c.key === s.ui.selectedKey) ??
  s.ui.community.find((c) => c.key === s.ui.selectedKey) ??
  CHALLENGES[0];
