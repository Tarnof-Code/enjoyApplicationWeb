// redux/store.js
import { configureStore } from '@reduxjs/toolkit';
import jwtReducer from './auth/jwtSlice';

const store = configureStore({
    reducer: {
        jwt: jwtReducer,
    },
});

export default store;

