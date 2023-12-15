import type { Socket } from 'socket.io';

export interface LogoutParams {
    socket: Socket;
}

export interface MonitorAdminEmitParams {
    event: string;
    type: string;
    id: string;
    from: string;
    timestamp: string;
    ip: string;
}
