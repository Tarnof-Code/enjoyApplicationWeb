// authSlice.js
import { createSlice } from '@reduxjs/toolkit';
import { persistReducer } from 'redux-persist';
import storage from 'redux-persist/lib/storage';

const authSlice = createSlice({
    name: 'auth',
    initialState: {
        role: null,
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

const persistConfig = {
    key: 'auth',
    storage,
};


export const { setUser, clearUser } = authSlice.actions;
export default authSlice.reducer;
