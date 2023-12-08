/* eslint-disable import/no-extraneous-dependencies */
import 'dotenv/config';
import debug from 'debug';
import { nanoid } from 'nanoid';
import { io } from 'socket.io-client';
import { PORT, TOKEN_ADMINS } from '../src/constants';

const WS_SERVER_URL = `ws://localhost:${PORT}`;
const logger = debug('core');
const socket = io(WS_SERVER_URL);

socket.on('connect', () => {
    const myId = nanoid();
    logger('Connected to server:', myId);

    socket.emit('login', {
        id: myId,
        token: TOKEN_ADMINS,
    });

    // simula um evento assincrono de entrar na pagina (apos 10 segundos);
    setTimeout(() => {
        const allOnlines: string[] = [];
        logger('Entrando na pagina de monitoramento');
        socket.on('monitorCreators', (data) => {
            logger('monitorCreators', data);
            if (data.event === 'connect') {
                allOnlines.push(data.id);
            } else {
                allOnlines.splice(allOnlines.indexOf(data.id), 1);
            }
        });
        socket.emit('subscribeCreatorsOnline');

        // simula a visualizacao da grid (com refresh)
        setInterval(() => {
            logger('allOnlines', allOnlines);
        }, 1000);

        // simula um evento assincrono de sair da pagina (apos 10 segundos);
        setTimeout(() => {
            logger('Saindo da pagina de monitoramento');
            socket.emit('unsubscribeCreatorsOnline');
        }, 10000);
    }, 10000);
});

socket.on('disconnect', () => {
    logger('Disconnected from server');
});
