import { createSlice } from '@reduxjs/toolkit';

const jwtSlice = createSlice({
    name: 'jwt',
    initialState: { jwt: null },
    reducers: {
        setJWT: (state, action) => {
            state.jwt = action.payload;
        },
        clearJWT: (state) => {
            state.jwt = null;
        },
    },
});

export const { setJWT, clearJWT } = jwtSlice.actions;
export default jwtSlice.reducer;

