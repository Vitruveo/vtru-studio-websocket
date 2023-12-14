import { Socket } from 'socket.io';

import { login } from './login';
import { logout } from './logout';

export const featuresOnConnection = ({ socket }: { socket: Socket }) => [
    login({ socket }),
];

export const featuresOnDisconnect = ({ socket }: { socket: Socket }) => [
    logout({ socket }),
];
