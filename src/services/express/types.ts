export interface APIEcho {
    server: string;
    time: string;
    version: string;
}

export interface APIResponse<T = unknown, E = any> {
    code: string;
    transaction: string;
    message: string;
    args?: E;
    data?: T;
}
