import assert from 'assert';
import withV4 from '../support/withV4';
import BucketUtility from '../../lib/utility/bucket-util';

const bucket = 'buckettestmultiplebackendput';
const key = 'somekey';
const body = 'somestring';
let bucketUtil;
let s3;


describe('MultipleBackend put object', () => {
    withV4(sigCfg => {
        beforeEach(() => {
            bucketUtil = new BucketUtility('default', sigCfg);
            s3 = bucketUtil.s3;
            process.stdout.write('Creating bucket');
            return s3.createBucketAsync({ Bucket: bucket })
            .catch(err => {
                process.stdout.write(`Error creating bucket: ${err}\n`);
                throw err;
            });
        });

        afterEach(() => {
            process.stdout.write('Emptying bucket\n');
            return bucketUtil.empty(bucket)
            .then(() => {
                process.stdout.write('Deleting bucket\n');
                return bucketUtil.deleteOne(bucket);
            })
            .catch(err => {
                process.stdout.write(`Error in afterEach: ${err}\n`);
                throw err;
            });
        });

        it('should return an error to put request without a valid bucket name',
            done => {
                s3.putObject({ Bucket: '', Key: key }, err => {
                    assert.notEqual(err, null,
                        'Expected failure but got success');
                    assert.strictEqual(err.code, 'MethodNotAllowed');
                    done();
                });
            });

        it('should return an error to put request without a valid key name',
            done => {
                s3.putObject({ Bucket: bucket, Key: '' }, err => {
                    assert.notEqual(err, null,
                        'Expected failure but got success');
                    assert.strictEqual(err.code, 'BucketAlreadyOwnedByYou');
                    done();
                });
            });

        describe('with set location from "x-amz-meta-scal-' +
            'location-constraint" header', () => {
            it('should return an error to put request without a valid ' +
                'location constraint', done => {
                const params = { Bucket: bucket, Key: key,
                    Body: body,
                    Metadata: { 'scal-location-constraint': 'fail-region' } };
                s3.putObject(params, err => {
                    assert.notEqual(err, null, 'Expected failure but got ' +
                        'success');
                    assert.strictEqual(err.code, 'InvalidArgument');
                    done();
                });
            });

            it('should put an object to mem', done => {
                const params = { Bucket: bucket, Key: key,
                    Body: body,
                    Metadata: { 'scal-location-constraint': 'mem' },
                };
                s3.putObject(params, err => {
                    assert.equal(err, null, 'Expected success, ' +
                        `got error ${JSON.stringify(err)}`);
                    done();
                });
            });

            it('should put an object to file', done => {
                const params = { Bucket: bucket, Key: key,
                    Body: body,
                    Metadata: { 'scal-location-constraint': 'file' },
                };
                s3.putObject(params, err => {
                    assert.equal(err, null, 'Expected success, ' +
                        `got error ${JSON.stringify(err)}`);
                    done();
                });
            });

            it('should put an object to sproxyd', done => {
                const params = { Bucket: bucket, Key: key,
                    Body: body,
                    Metadata: { 'scal-location-constraint':
                        'scality-us-east-1' },
                };
                s3.putObject(params, err => {
                    assert.equal(err, null, 'Expected success, ' +
                        `got error ${JSON.stringify(err)}`);
                    done();
                });
            });
        });
    });
});

describe('MultipleBackend put object based on bucket location', () => {
    withV4(sigCfg => {
        const params = { Bucket: bucket, Key: key, Body: body };

        afterEach(() => {
            process.stdout.write('Emptying bucket\n');
            return bucketUtil.empty(bucket)
            .then(() => {
                process.stdout.write('Deleting bucket\n');
                return bucketUtil.deleteOne(bucket);
            })
            .catch(err => {
                process.stdout.write(`Error in afterEach: ${err}\n`);
                throw err;
            });
        });

        it('should put an object mem with no location header', done => {
            bucketUtil = new BucketUtility('default', sigCfg);
            s3 = bucketUtil.s3;
            process.stdout.write('Creating bucket\n');
            return s3.createBucket({ Bucket: bucket,
                CreateBucketConfiguration: {
                    LocationConstraint: 'mem',
                },
            }, err => {
                if (err) {
                    process.stdout.write(`Error creating bucket: ${err}\n`);
                    return err;
                }
                process.stdout.write('Putting object\n');
                return s3.putObject(params, err => {
                    assert.equal(err, null, 'Expected success, ' +
                        `got error ${JSON.stringify(err)}`);
                    s3.getObject({ Bucket: bucket, Key: key }, err => {
                        assert.strictEqual(err, null, 'Expected success, ' +
                        `got error ${JSON.stringify(err)}`);
                        done();
                    });
                });
            });
        });

        it('should put an object to sproxyd with no location header', done => {
            bucketUtil = new BucketUtility('default', sigCfg);
            s3 = bucketUtil.s3;
            process.stdout.write('Creating bucket\n');
            return s3.createBucket({ Bucket: bucket,
                CreateBucketConfiguration: {
                    LocationConstraint: 'scality-us-east-1',
                },
            }, err => {
                if (err) {
                    process.stdout.write(`Error creating bucket: ${err}\n`);
                    return err;
                }
                process.stdout.write('Putting object\n');
                return s3.putObject(params, err => {
                    assert.equal(err, null, 'Expected success, ' +
                        `got error ${JSON.stringify(err)}`);
                    s3.getObject({ Bucket: bucket, Key: key }, err => {
                        assert.strictEqual(err, null, 'Expected succes, ' +
                            `got error ${JSON.stringify(err)}`);
                        done();
                    });
                });
            });
        });
    });
});

// describe('MultipleBackend put based on request endpoint', () => {
//     withV4(sigCfg => {
//         before(() => {
//             bucketUtil = new BucketUtility('default', sigCfg);
//             s3 = bucketUtil.s3;
//             process.stdout.write('Creating bucket');
//             return s3.createBucketAsync({ Bucket: bucket })
//             .catch(err => {
//                 process.stdout.write(`Error creating bucket: ${err}\n`);
//                 throw err;
//             });
//         });

//         after(() => {
//             process.stdout.write('Emptying bucket\n');
//             return bucketUtil.empty(bucket)
//             .then(() => {
//                 process.stdout.write('Deleting bucket\n');
//                 return bucketUtil.deleteOne(bucket);
//             })
//             .catch(err => {
//                 process.stdout.write(`Error in afterEach: ${err}\n`);
//                 throw err;
//             });
//         });

//         it('should ');
//     });
// });
