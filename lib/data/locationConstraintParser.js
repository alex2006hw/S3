import file from './file/backend';
import inMemory from './in_memory/backend';
import Sproxy from 'sproxydclient';

import config from '../Config';

const clients = {};

export default function parseLC() {
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
            && Object.keys(locationObj.details.connector).
                indexOf('sproxyd') > -1) {
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
    return clients;
}
