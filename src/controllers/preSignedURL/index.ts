import debug from 'debug';
import type { AssetEnvelope } from '../types';
import { RABBITMQ_EXCHANGE_CREATORS } from '../../constants';
import { disconnect, getChannel } from '../../services/rabbitmq';
import { captureException } from '../../services/sentry';
import { io } from '../../services';

const logger = debug('controllers:preSignedURL');

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

    const logQueue = `${RABBITMQ_EXCHANGE_CREATORS}.assets`;
    logger('logQueue', logQueue, 'routingKey', 'preSignedURL');
    channel.assertExchange(RABBITMQ_EXCHANGE_CREATORS, 'topic', {
        durable: true,
    });
    channel.assertQueue(logQueue, { durable: false });
    channel.bindQueue(logQueue, RABBITMQ_EXCHANGE_CREATORS, 'preSignedURL');
    channel.consume(logQueue, async (message) => {
        if (!message) {
            logger('logQueue', logQueue, 'message', 'No message received');
            return;
        }

        try {
            if (message.fields.routingKey !== 'preSignedURL') {
                channel.nack(message);
                return;
            }

            const content = message.content.toString();

            logger('logQueue', logQueue, 'message', content);
            // parse envelope
            const parsedMessage = JSON.parse(content.trim()) as AssetEnvelope;

            const sockets = await io.sockets.in('creators').fetchSockets();
            const socketsAdmin = await io.sockets.in('admins').fetchSockets();

            logger('sockets', sockets);
            logger('socketsAdmin', socketsAdmin);

            sockets.forEach((socket) => {
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

            socketsAdmin.forEach((socket) => {
                if (socket.data.id === parsedMessage.userId) {
                    socket.emit('preSignedURL', {
                        preSignedURL: parsedMessage.preSignedURL,
                        transactionId: parsedMessage.transactionId,
                        path: parsedMessage.path,
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
        logger(`Closing channel ${logQueue}`);
        await channel.close();

        // disconnect from RabbitMQ
        await disconnect();
    });
};
