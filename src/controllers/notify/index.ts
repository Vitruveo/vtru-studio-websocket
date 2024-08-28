import debug from 'debug';
import { nanoid } from 'nanoid';

import { RABBITMQ_EXCHANGE_CREATORS } from '../../constants';
import { getChannel, disconnect, io } from '../../services';

const logger = debug('controllers:notify');

const uniqueId = nanoid();

// TODO: create dead letter for queue
export const start = async () => {
    const channel = await getChannel();

    if (!channel) {
        logger('Channel not available');
        process.exit(1);
    }
    channel.on('close', () => {
        logger('Channel closed');
        process.exit(1);
    });
    channel.on('error', (error) => {
        logger('Error occurred in channel:', error);
        process.exit(1);
    });

    logger('Channel controller notify started');

    const logQueue = `${RABBITMQ_EXCHANGE_CREATORS}.notifications.${uniqueId}`;
    logger('logQueue', logQueue);
    channel.assertExchange(RABBITMQ_EXCHANGE_CREATORS, 'topic', {
        durable: true,
    });
    channel.assertQueue(logQueue, { durable: false });
    channel.bindQueue(logQueue, RABBITMQ_EXCHANGE_CREATORS, 'userNotification');
    channel.consume(logQueue, async (data) => {
        if (!data) return;
        try {
            const parsedMessage = JSON.parse(data.content.toString().trim());

            logger('Received message:', parsedMessage);

            const sockets = await io.sockets.in('creators').fetchSockets();

            sockets.forEach((socket) => {
                if (socket.data.id === parsedMessage.creatorId) {
                    socket.emit('userNotification', {
                        userId: parsedMessage.creatorId,
                        notification: parsedMessage,
                    });
                }
            });

            channel.ack(data);
        } catch (error) {
            logger('Error occurred in controller notify:', error);
        }
    });

    process.once('SIGINT', async () => {
        logger(`Deleting queue ${logQueue}`);
        await channel.deleteQueue(logQueue);

        // disconnect from RabbitMQ
        await disconnect();
    });
};
