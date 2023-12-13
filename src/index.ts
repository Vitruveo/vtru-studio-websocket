// This eslint rule is disabled because we need to use the "data" property on socket (to persist)
/* eslint-disable no-param-reassign */
import { createServer } from 'http';
import 'dotenv/config';
import debug from 'debug';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { nanoid } from 'nanoid';
import { Server } from 'socket.io';
import type { CreatorsPresignedEnvelope, SocketLogin } from './types';
import {
    PORT,
    RABBITMQ_EXCHANGE_CREATORS,
    TOKEN_ADMINS,
    TOKEN_CREATORS,
} from './constants';
import { getChannel } from './services/rabbitmq';
import { captureException } from './services/sentry';

dayjs.extend(utc);
dayjs.extend(timezone);

const logger = debug('core');
const uniqueId = nanoid();
const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
    cors: {
        origin: '*',
    },
});

app.set('trust proxy', true);
app.use(cors());
app.use(express.json());

// TODO: send to cloudwatch
app.use(morgan('combined'));

// FIXME: type properly the entire app
// FIXME: create a consistent message type to emit (to validate if we had forget to send some field)
io.on('connection', (socket) => {
    socket.data.when = dayjs();
    socket.data.ip =
        socket.handshake.headers['x-forwarded-for'] || socket.handshake.address;
    logger(`New client connected: ${socket.id} from ${socket.data.ip}`);

    socket.on('login', (data: SocketLogin) => {
        socket.data.id = data.id;
        socket.data.email = data.email;

        if (data.token === TOKEN_ADMINS) {
            socket.data.type = 'admin';

            // on-demand
            socket.on('subscribeCreatorsOnline', async () => {
                socket.join('monitorCreators');
                const sockets = await io.sockets.in('creators').fetchSockets();
                sockets.forEach((s: any) => {
                    socket.emit('monitorCreators', {
                        event: 'connect',
                        type: s.data.type,
                        id: s.data.id,
                        email: s.data.email,
                        from: s.data.when.toISOString(),
                        ip: s.data.ip,
                    });
                });
            });
            socket.on('unsubscribeCreatorsOnline', () => {
                socket.leave('monitorCreators');
            });

            socket.join('admins');
        } else if (data.token === TOKEN_CREATORS) {
            socket.data.type = 'creator';
            socket.join('creators');
            io.to('monitorCreators').emit('monitorCreators', {
                event: 'connect',
                type: socket.data.type,
                id: socket.data.id,
                email: socket.data.email,
                from: socket.data.when.toISOString(),
                ip: socket.data.ip,
            });
        }
        logger(`${socket.data.type} ${data.id} connected`);
    });

    socket.on('disconnect', () => {
        if (socket.data.type === 'admin') {
            io.to('monitorAdmins').emit('monitorAdmins', {
                event: 'disconnect',
                type: socket.data.type,
                id: socket.data.id,
                from: socket.data.when.toISOString(),
                timestamp: dayjs().toISOString(),
                ip: socket.data.ip,
            });
        }
        if (socket.data.type === 'creator') {
            io.to('monitorCreators').emit('monitorCreators', {
                event: 'disconnect',
                type: socket.data.type,
                id: socket.data.id,
                from: socket.data.when.toISOString(),
                timestamp: dayjs().toISOString(),
                ip: socket.data.ip,
            });
        }
        logger(`Client disconnected: ${socket.id}`);
    });
});

export const start = async () => {
    const channel = await getChannel();
    const logQueue = `${RABBITMQ_EXCHANGE_CREATORS}.assets.${uniqueId}`;

    channel?.assertExchange(RABBITMQ_EXCHANGE_CREATORS, 'topic', {
        durable: true,
    });
    channel?.assertQueue(logQueue, { durable: false });
    channel?.bindQueue(logQueue, RABBITMQ_EXCHANGE_CREATORS, 'presignedURL');

    channel?.consume(logQueue, async (message) => {
        if (!message) return;

        try {
            // parse envelope
            const parsedMessage = JSON.parse(
                message.content.toString().trim()
            ) as CreatorsPresignedEnvelope;

            const sockets = await io.sockets.in('creators').fetchSockets();
            sockets.forEach((socket) => {
                if (socket.data.id === parsedMessage.creatorId) {
                    socket.emit('presignedURL', {
                        presignedURL: parsedMessage.presignedURL,
                    });
                }
            });

            channel?.ack(message);
            return;
        } catch (parsingError) {
            captureException(parsingError);
        }
        channel?.nack(message);
    });
};

start().catch((error) => {
    logger('Rabbitmq failed to start');
    captureException(error);
    process.exit(1);
});

httpServer.listen(PORT, () => {
    logger(`Server is listening on port ${PORT}`);
});
