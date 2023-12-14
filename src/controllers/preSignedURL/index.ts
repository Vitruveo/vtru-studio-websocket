import { nanoid } from 'nanoid';
import type { AssetEnvelope } from '../types';
import { RABBITMQ_EXCHANGE_CREATORS } from '../../constants';
import { getChannel } from '../../services/rabbitmq';
import { captureException } from '../../services/sentry';
import { io } from '../../services';

const uniqueId = nanoid();

export const start = async () => {
    const channel = await getChannel();
    const logQueue = `${RABBITMQ_EXCHANGE_CREATORS}.assets.${uniqueId}`;

    channel?.assertExchange(RABBITMQ_EXCHANGE_CREATORS, 'topic', {
        durable: true,
    });
    channel?.assertQueue(logQueue, { durable: false });
    channel?.bindQueue(logQueue, RABBITMQ_EXCHANGE_CREATORS, 'preSignedURL');

    channel?.consume(logQueue, async (message) => {
        if (!message) return;

        try {
            // parse envelope
            const parsedMessage = JSON.parse(
                message.content.toString().trim()
            ) as AssetEnvelope;

            const sockets = await io.sockets.in('creators').fetchSockets();
            sockets.forEach((socket) => {
                if (socket.data.id === parsedMessage.creatorId) {
                    socket.emit('preSignedURL', {
                        preSignedURL: parsedMessage.preSignedURL,
                        transactionId: parsedMessage.transactionId,
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
