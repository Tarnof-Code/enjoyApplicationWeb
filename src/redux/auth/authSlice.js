import { createSlice } from '@reduxjs/toolkit';

const authSlice = createSlice({
    name: 'auth',
    initialState: {
        role: null
    },
    reducers: {
        setUser: (state, action) => {
            state.role = action.payload.role;
        },
        clearUser: (state) => {
            state.role = null;
        },
    },
});

export const { setUser, clearUser } = authSlice.actions;
export default authSlice.reducer;

