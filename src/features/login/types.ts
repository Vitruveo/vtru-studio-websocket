import type { Socket } from 'socket.io';

export interface LoginParams {
    socket: Socket;
}

export interface SocketLogin {
    id: string;
    token: string;
    email: string;
}

export interface MonitorCreatorsEmitParams {
    event: string;
    type: string;
    id: string;
    from: string;
    email: string;
    ip: string;
}
