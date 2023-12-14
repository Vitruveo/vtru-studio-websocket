import dayjs from 'dayjs';
import { io } from '../../services';
import type { LogoutParams, MonitorAdminEmitParams } from './types';

export const logout = ({ socket }: LogoutParams) => {
    if (socket.data.type === 'admin') {
        io.to('monitorAdmins').emit('monitorAdmins', {
            event: 'disconnect',
            type: socket.data.type,
            id: socket.data.id,
            from: socket.data.when.toISOString(),
            timestamp: dayjs().toISOString(),
            ip: socket.data.ip,
        } as MonitorAdminEmitParams);
    }
    if (socket.data.type === 'creator') {
        io.to('monitorCreators').emit('monitorCreators', {
            event: 'disconnect',
            type: socket.data.type,
            id: socket.data.id,
            from: socket.data.when.toISOString(),
            timestamp: dayjs().toISOString(),
            ip: socket.data.ip,
        } as MonitorAdminEmitParams);
    }
};
