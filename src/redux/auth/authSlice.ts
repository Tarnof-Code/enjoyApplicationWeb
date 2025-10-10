// authSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { persistReducer } from 'redux-persist';
import storage from 'redux-persist/lib/storage';

interface AuthState {
    role: string | null;
    prenom: string | null;
    genre: string | null;
}

interface UserPayload {
    role: string;
    prenom: string;
    genre: string;
}

const initialState: AuthState = {
    role: null,
    prenom: null,
    genre: null,
};

const authSlice = createSlice({
    name: 'auth',
    initialState,
    reducers: {
        setUser: (state, action: PayloadAction<UserPayload>) => {
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
export default persistReducer(persistConfig, authSlice.reducer);
export type { AuthState, UserPayload };
