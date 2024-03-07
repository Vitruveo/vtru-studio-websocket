// This eslint rule is disabled because we need to use the "data" property on socket (to persist)
/* eslint-disable no-param-reassign */
import debug from 'debug';
import { io } from '../../services';
import { RABBITMQ_URL, TOKEN_ADMINS, TOKEN_CREATORS } from '../../constants';
import type {
    LoginParams,
    MonitorCreatorsEmitParams,
    SocketLogin,
} from './types';

const logger = debug('features:login');

export const login = ({ socket }: LoginParams) => {
    socket.on('login', (data: SocketLogin) => {
        socket.data.id = data.id;
        socket.data.email = data.email;
        console.log(
            `
            RabbitMQ PORT: ${process.env.RABBITMQ_PORT}
            RabbitMQ HOST: ${process.env.RABBITMQ_HOST}
            RABBITMQ_URL: ${RABBITMQ_URL}
            Token received: ${data.token}
             Token creators: ${TOKEN_CREATORS} 
             Token admins: ${TOKEN_ADMINS}`
        );
        if (data.token === TOKEN_CREATORS) {
            console.log('Token is valid');
            socket.data.type = 'creator';
            socket.join('creators');
            io.to('monitorCreators').emit('monitorCreators', {
                event: 'connect',
                type: socket.data.type,
                id: socket.data.id,
                email: socket.data.email,
                from: socket.data.when.toISOString(),
                ip: socket.data.ip,
            } as MonitorCreatorsEmitParams);
        } else if (data.token === TOKEN_ADMINS) {
            socket.data.type = 'admin';

            // on-demand
            socket.on('subscribeCreatorsOnline', async () => {
                socket.join('monitorCreators');
                const sockets = await io.sockets.in('creators').fetchSockets();
                sockets.forEach((s: any) => {
                    socket.emit('monitorCreators', {
                        event: 'connect',
                        type: s.data.type,
                        id: s.data.id,
                        email: s.data.email,
                        from: s.data.when.toISOString(),
                        ip: s.data.ip,
                    } as MonitorCreatorsEmitParams);
                });
            });
            socket.on('unsubscribeCreatorsOnline', () => {
                socket.leave('monitorCreators');
            });

            socket.join('admins');
        }
        logger(`${socket.data.type} ${data.id} connected`);
    });
};
