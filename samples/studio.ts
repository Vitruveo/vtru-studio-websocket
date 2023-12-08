/* eslint-disable import/no-extraneous-dependencies,@typescript-eslint/no-unused-vars */
import 'dotenv/config';
import debug from 'debug';
import { nanoid } from 'nanoid';
import { io } from 'socket.io-client';
import { PORT, TOKEN_CREATORS } from '../src/constants';

const WS_SERVER_URL = `ws://localhost:${PORT}`;
const logger = debug('core');
const socket = io(WS_SERVER_URL);

socket.on('connect', () => {
    const myId = nanoid();
    logger('Connected to server:', myId);

    socket.emit('login', {
        id: myId,
        token: TOKEN_CREATORS,
    });
});

socket.on('dispatch', (_event) => {
    // send to redux dispatch
});

socket.on('disconnect', () => {
    logger('Disconnected from server');
});
