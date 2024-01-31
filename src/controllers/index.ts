import debug from 'debug';
import * as preSignedURL from './preSignedURL';
import { getConnection } from '../services';

const logger = debug('controllers');

export const controllersStart = async () => {
    const rabbitmqStatus = await getConnection();
    if (!rabbitmqStatus.isConnected || !rabbitmqStatus.connection) {
        logger('RabbitMQ connection failed, retrying in 10 seconds...');
        setTimeout(controllersStart, 10000);
        return;
    }

    rabbitmqStatus.connection.on('close', () => {
        logger('RabbitMQ connection closed, restarting in 10 seconds...');
        setTimeout(controllersStart, 10000);
    });

    await preSignedURL.start();
};

controllersStart().catch((error) => {
    logger(`Controlller failed to start: ${error}`);
});
