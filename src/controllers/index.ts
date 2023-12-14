import debug from 'debug';
import * as preSignedURL from './preSignedURL';

const logger = debug('core:controllers');

export const controllersStart = async () => {
    await preSignedURL.start();
};

controllersStart().catch((error) => {
    logger(`Controlller failed to start: ${error}`);
});
