export interface AssetEnvelope {
    preSignedURL: string;
    creatorId: string;
    userId: string; // user admin
    transactionId: string;
    path: string;
    origin: string;
    method: 'PUT' | 'DELETE';
}
