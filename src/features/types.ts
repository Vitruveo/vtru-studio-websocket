import type { Socket } from 'socket.io';

export interface FeaturesOnConnectionParams {
    socket: Socket;
}

export interface FeaturesOnDisconnectParams {
    socket: Socket;
}
