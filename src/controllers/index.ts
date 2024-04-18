import debug from 'debug';
import * as preSignedURL from './preSignedURL';
import * as notify from './notify';
import { getConnection } from '../services';

const logger = debug('controllers');

export const controllersStart = async () => {
    await getConnection();

    await preSignedURL.start();
    await notify.start();
};

controllersStart().catch((error) => {
    logger(`Controlller failed to start: ${error}`);
});
