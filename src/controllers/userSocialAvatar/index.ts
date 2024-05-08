import debug from 'debug';
import { nanoid } from 'nanoid';

import { RABBITMQ_EXCHANGE_CREATORS } from '../../constants';
import { disconnect, getChannel } from '../../services/rabbitmq';
import { captureException } from '../../services/sentry';
import { io } from '../../services';
import { AvatarEnvelope } from './types';

const logger = debug('controllers:userSocialAvatar');

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

    logger('Channel controller userSocialAvatar started');

    const logQueue = `${RABBITMQ_EXCHANGE_CREATORS}.social.${uniqueId}`;
    logger('logQueue', logQueue);
    channel.assertExchange(RABBITMQ_EXCHANGE_CREATORS, 'topic', {
        durable: true,
    });
    channel.assertQueue(logQueue, { durable: false });
    channel.bindQueue(logQueue, RABBITMQ_EXCHANGE_CREATORS, 'userSocialAvatar');
    channel.consume(logQueue, async (message) => {
        if (!message) return;

        try {
            const parsedMessage = JSON.parse(
                message.content.toString().trim()
            ) as AvatarEnvelope;

            logger(parsedMessage);

            const sockets = await io.sockets.in('creators').fetchSockets();

            sockets.forEach((socket) => {
                if (socket.data.id === parsedMessage.creatorId) {
                    socket.emit('userSocialAvatar', {
                        social: {
                            type: parsedMessage.type,
                            name: parsedMessage.name,
                            avatar: parsedMessage.avatar,
                        },
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

    process.once('SIGINT', async () => {
        logger(`Deleting queue ${logQueue}`);
        await channel.deleteQueue(logQueue);

        // disconnect from RabbitMQ
        await disconnect();
    });
};
