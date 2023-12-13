export interface SocketLogin {
    id: string;
    token: string;
    email: string;
}

export interface CreatorsPresignedEnvelope {
    presignedURL: string;
    creatorId: string;
}
