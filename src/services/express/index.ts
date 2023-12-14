import os from 'os';
import { createServer } from 'http';
import { nanoid } from 'nanoid';
import debug from 'debug';
import dayjs from 'dayjs';
import express from 'express';
import morgan from 'morgan';
import cors from 'cors';
import { PORT } from '../../constants';
import { APIEcho, APIResponse } from './types';

const logger = debug('services:express');

const app = express();
const httpServer = createServer(app);

app.set('trust proxy', true);
app.use(cors());
app.use(express.json());

// TODO: send to cloudwatch
app.use(morgan('combined'));

app.get('/', (_req, res) => {
    res.status(200).json({
        code: 'echo',
        transaction: nanoid(),
        message: 'OK',
        args: [],
        data: {
            server: os.hostname(),
            time: dayjs().toISOString(),
            version: '1.0.0',
        },
    } as APIResponse<APIEcho>);
});

httpServer.listen(PORT, () => {
    logger(`Server is listening on port ${PORT}`);
});

export { app, httpServer };
