// This eslint rule is disabled because we need to use the "data" property on socket (to persist)
/* eslint-disable no-param-reassign */
import dayjs from 'dayjs';
import debug from 'debug';
import { Server } from 'socket.io';
import { httpServer } from '../express';
import { featuresOnConnection, featuresOnDisconnect } from '../../features';

const logger = debug('services:websocket');

const io = new Server(httpServer, {
    cors: {
        origin: '*',
    },
});

io.on('connection', (socket) => {
    socket.data.when = dayjs();
    socket.data.ip =
        socket.handshake.headers['x-forwarded-for'] || socket.handshake.address;
    logger(`New client connected: ${socket.id} from ${socket.data.ip}`);
    featuresOnConnection({ socket });

    socket.on('disconnect', () => {
        featuresOnDisconnect({ socket });
        logger(`Client disconnected: ${socket.id}`);
    });
});

export { io };
