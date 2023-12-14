import dayjs from 'dayjs';
import { Socket } from 'socket.io';
import { io } from '../../services';

interface LogoutParams {
    socket: Socket;
}

export const logout = ({ socket }: LogoutParams) => {
    if (socket.data.type === 'admin') {
        io.to('monitorAdmins').emit('monitorAdmins', {
            event: 'disconnect',
            type: socket.data.type,
            id: socket.data.id,
            from: socket.data.when.toISOString(),
            timestamp: dayjs().toISOString(),
            ip: socket.data.ip,
        });
    }
    if (socket.data.type === 'creator') {
        io.to('monitorCreators').emit('monitorCreators', {
            event: 'disconnect',
            type: socket.data.type,
            id: socket.data.id,
            from: socket.data.when.toISOString(),
            timestamp: dayjs().toISOString(),
            ip: socket.data.ip,
        });
    }
};
