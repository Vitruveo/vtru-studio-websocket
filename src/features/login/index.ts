// This eslint rule is disabled because we need to use the "data" property on socket (to persist)
/* eslint-disable no-param-reassign */
import debug from 'debug';
import { Socket } from 'socket.io';
import { io } from '../../services';
import { TOKEN_ADMINS, TOKEN_CREATORS } from '../../constants';
import { SocketLogin } from './types';

interface LoginParams {
    socket: Socket;
}

const logger = debug('features:login');

export const login = ({ socket }: LoginParams) => {
    socket.on('login', (data: SocketLogin) => {
        socket.data.id = data.id;
        socket.data.email = data.email;

        if (data.token === TOKEN_ADMINS) {
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
                    });
                });
            });
            socket.on('unsubscribeCreatorsOnline', () => {
                socket.leave('monitorCreators');
            });

            socket.join('admins');
        } else if (data.token === TOKEN_CREATORS) {
            socket.data.type = 'creator';
            socket.join('creators');
            io.to('monitorCreators').emit('monitorCreators', {
                event: 'connect',
                type: socket.data.type,
                id: socket.data.id,
                email: socket.data.email,
                from: socket.data.when.toISOString(),
                ip: socket.data.ip,
            });
        }
        logger(`${socket.data.type} ${data.id} connected`);
    });
};
