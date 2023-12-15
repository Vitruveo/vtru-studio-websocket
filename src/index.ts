import 'dotenv/config';
import debug from 'debug';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import './services';
import './controllers';

dayjs.extend(utc);
dayjs.extend(timezone);

const logger = debug('core:');

logger('Starting websocket server');
