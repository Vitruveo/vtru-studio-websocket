import debug from 'debug';
import { nanoid } from 'nanoid';
import { RABBITMQ_EXCHANGE_CREATORS } from '../../constants';
import { getChannel } from '../../services/rabbitmq';
import { captureException } from '../../services/sentry';
import { io } from '../../services';
import { NotifyEnvelope } from './types';

const logger = debug('controllers:notify');

const uniqueId = nanoid();

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

    const notificationQueue = `${RABBITMQ_EXCHANGE_CREATORS}.notifications.${uniqueId}`;

    channel.assertExchange(RABBITMQ_EXCHANGE_CREATORS, 'topic', {
        durable: true,
    });
    channel.assertQueue(notificationQueue, { durable: false });
    channel.bindQueue(
        notificationQueue,
        RABBITMQ_EXCHANGE_CREATORS,
        'userNotification'
    );

    channel.consume(notificationQueue, async (message) => {
        if (!message) return;

        try {
            const parsedMessage = JSON.parse(
                message.content.toString().trim()
            ) as NotifyEnvelope;

            console.log(parsedMessage);

            const sockets = await io.sockets.in('creators').fetchSockets();

            sockets.forEach((socket) => {
                if (socket.data.id === parsedMessage.creatorId) {
                    socket.emit('userNotification', {
                        userId: parsedMessage.creatorId,
                        notification: parsedMessage,
                    });
                }
            });

            channel.ack(message);
            return;
        } catch (parsingError) {
            captureException(parsingError);
        }
        channel.nack(message);
    });
};
