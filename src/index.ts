import 'dotenv/config';
import debug from 'debug';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import './services';
import { start as preSignedURLStart } from './controllers/preSignedURL';

dayjs.extend(utc);
dayjs.extend(timezone);

const logger = debug('core:');

const start = async () => {
    await preSignedURLStart();
    logger('Controlller started');
};

start().catch((error) => {
    logger(`Controlller failed to start: ${error}`);
});

logger('Starting websocket server');
