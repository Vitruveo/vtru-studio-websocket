export interface AssetEnvelope {
    preSignedURL: string;
    creatorId: string;
    transactionId: string;
    path: string;
    origin: string;
    method: 'PUT' | 'DELETE';
}
