import debug from 'debug';
import { nanoid } from 'nanoid';
import type { AssetEnvelope } from '../types';
import { RABBITMQ_EXCHANGE_CREATORS } from '../../constants';
import { disconnect, getChannel } from '../../services/rabbitmq';
import { captureException } from '../../services/sentry';
import { io } from '../../services';

const logger = debug('controllers:preSignedURL');

const uniqueId = nanoid();

// TODO: implement dead-letter queue
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

    logger('Channel controller preSignedURL started');

    const logQueue = `${RABBITMQ_EXCHANGE_CREATORS}.assets.${uniqueId}`;
    logger('logQueue', logQueue);
    channel.assertExchange(RABBITMQ_EXCHANGE_CREATORS, 'topic', {
        durable: true,
    });
    channel.assertQueue(logQueue, { durable: false });
    channel.bindQueue(logQueue, RABBITMQ_EXCHANGE_CREATORS, 'preSignedURL');
    channel.consume(logQueue, async (message) => {
        console.log('message received:', message);
        if (!message) return;

        try {
            // parse envelope
            const parsedMessage = JSON.parse(
                message.content.toString().trim()
            ) as AssetEnvelope;

            const sockets = await io.sockets.in('creators').fetchSockets();

            console.log('Sockets connected:', sockets);

            sockets.forEach((socket) => {
                console.log(
                    'socket.data.id:',
                    socket.data.id,
                    'parsedMessage.creatorId:',
                    parsedMessage.creatorId
                );
                if (socket.data.id === parsedMessage.creatorId) {
                    socket.emit('preSignedURL', {
                        preSignedURL: parsedMessage.preSignedURL,
                        transactionId: parsedMessage.transactionId,
                        path: parsedMessage.path,
                        origin: parsedMessage.origin,
                        method: parsedMessage.method,
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
