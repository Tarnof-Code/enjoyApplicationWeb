// authSlice.js
import { createSlice } from '@reduxjs/toolkit';
import { persistReducer } from 'redux-persist';
import storage from 'redux-persist/lib/storage';

const authSlice = createSlice({
    name: 'auth',
    initialState: {
        role: null,
        prenom: null,
        genre: null,
    },
    reducers: {
        setUser: (state, action) => {
            state.role = action.payload.role;
            state.prenom = action.payload.prenom;
            state.genre = action.payload.genre;
        },
        clearUser: (state) => {
            state.role = null;
            state.prenom = null;
            state.genre = null;
        },
    },
});

const persistConfig = {
    key: 'auth',
    storage,
    whitelist: ['role', 'prenom', 'genre'],
};


export const { setUser, clearUser } = authSlice.actions;
export default authSlice.reducer;
