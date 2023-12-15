import { login } from './login';
import { logout } from './logout';
import type {
    FeaturesOnConnectionParams,
    FeaturesOnDisconnectParams,
} from './types';

export const featuresOnConnection = ({
    socket,
}: FeaturesOnConnectionParams) => [login({ socket })];

export const featuresOnDisconnect = ({
    socket,
}: FeaturesOnDisconnectParams) => [logout({ socket })];
