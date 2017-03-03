import AWS from 'aws-sdk';
import UUID from 'node-uuid';
import Sproxy from 'sproxydclient';
import { errors } from 'arsenal';
import { Logger } from 'werelogs';

import file from './file/backend';
import inMemory from './in_memory/backend';
import config from '../Config';

const logger = new Logger('MultipleBackendGateway', {
    logLevel: config.log.logLevel,
    dumpLevel: config.log.dumpLevel,
});

function createLogger(reqUids) {
    return reqUids ?
        logger.newRequestLoggerFromSerializedUids(reqUids) :
        logger.newRequestLogger();
}

const clients = {};
if (config.locationConstraints) {
    Object.keys(config.locationConstraints).forEach(location => {
        const locationObj = config.locationConstraints[location];
        if (locationObj.type === 'mem') {
            clients[location] = inMemory;
        }
        if (locationObj.type === 'file') {
            clients[location] = file;
        }
        if (locationObj.type === 'scality'
        && Object.keys(locationObj.details.connector).indexOf('sproxyd') > -1) {
            clients[location] = new Sproxy({
                bootstrap: locationObj.details.connector
                    .sproxyd.bootstrap,
                log: config.log,
                // Might be undefined which is ok since there is a default
                // set in sproxydclient if chordCos is undefined
                chordCos: locationObj.details.connector.sproxyd.chordCos,
            });
            clients[location].clientType = 'scality';
        }
        if (locationObj.type === 'aws_s3') {
            // TODO
        }
        if (locationObj.type === 'virtual-user-metadata') {
            // TODO
        }
    });
}

const multipleBackendGateway = {
    put: (stream, size, keyContext, backendInfo, reqUids, callback) => {
        const controllingLocationConstraint =
            backendInfo.getControllingLocationConstraint();
        const client = clients[controllingLocationConstraint];
        if (!client) {
            const log = createLogger(reqUids);
            log.error('no data backend matching controlling locationConstraint',
            { controllingLocationConstraint });
            return process.nextTick(() => {
                callback(errors.InternalError);
            });
        }
        return client.put(stream, size, keyContext,
            reqUids, (err, key) => {
                if (err) {
                    const log = createLogger(reqUids);
                    log.error('error from datastore',
                             { error: err, implName: client.clientType });
                    return callback(errors.InternalError);
                }
                const dataRetrievalInfo = {
                    key,
                    dataStoreName: controllingLocationConstraint,
                };
                return callback(null, dataRetrievalInfo);
            });
    },

    get: (objectGetInfo, range, reqUids, callback) => {
        const client = clients[objectGetInfo.dataStoreName];
        if (client.clientType === 'scality') {
            return client.get(objectGetInfo.key, range, reqUids, callback);
        }
        return client.get(objectGetInfo, range, reqUids, callback);
    },

    delete: (objectGetInfo, reqUids, callback) => {
        const client = clients[objectGetInfo.dataStoreName];
        if (client.clientType === 'scality') {
            return client.delete(objectGetInfo.key, reqUids, callback);
        }
        return client.delete(objectGetInfo, reqUids, callback);
    },

    // checkHealth:
};

export default multipleBackendGateway;
