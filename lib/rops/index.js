const through = require('through2');
const csv = require('csv-stringify');
const AWS = require('aws-sdk');
const archiver = require('archiver');

const proceduresColumns = [
  { key: 'ropId', header: 'return_id' },
  { key: 'id', header: 'id' },
  { key: 'species', header: 'species' },
  { key: 'severityNum', header: 'no_of_procedures' },
  { key: 'reuse', header: 'reuse' },
  { key: 'placesOfBirth', header: 'place_of_birth' },
  { key: 'nhpsOrigin', header: 'nhp_place_of_birth' },
  { key: 'nhpsGeneration', header: 'nhp_generation' },
  { key: 'ga', header: 'genetic_status' },
  { key: 'new_genetic_line', header: 'creation_of_new_genetic_line' },
  { key: 'purposes', header: 'purpose' },
  { key: 'subPurpose', header: 'sub_purpose' },
  { key: 'regulatoryLegislation', header: 'testing_by_legislation' },
  { key: 'regulatoryLegislationOrigin', header: 'legislative_requirements' },
  { key: 'severity', header: 'actual_severity' },
  { key: 'severity_ho_note', header: 'comments_for_ho' },
  { key: 'severity_personal_note', header: 'comments_for_personal_use' }
];

const getSubPurpose = procedure => {
  switch (procedure.purposes) {
    case 'basic':
      return procedure.basicSubpurposes;
    case 'regulatory':
      return procedure.regulatorySubpurposes;
    case 'translational':
      return procedure.translationalSubpurposes;
  }
};

module.exports = ({ models, s3 }) => {

  const { Establishment, Project, Procedure } = models;

  const S3 = new AWS.S3({
    apiVersion: '2006-03-01',
    region: s3.region,
    accessKeyId: s3.accessKey,
    secretAccessKey: s3.secret
  });

  return ({ id, key }) => {

    return new Promise((resolve, reject) => {

      const establishments = csv({ header: true });
      const projects = csv({ header: true });
      const procedures = csv({ header: true, columns: proceduresColumns });

      const meta = {
        due: 0,
        submitted: 0
      };

      Establishment.query()
        .select(
          'id',
          'name',
          'licenceNumber',
          'address',
          'country'
        )
        .toKnexQuery()
        .stream()
        .pipe(through.obj((record, enc, callback) => callback(null, record)))
        .pipe(establishments)
        .on('error', reject);

      Project.query()
        .select(
          'rops.id',
          'projects.licenceNumber',
          'projects.establishmentId',
          'projects.title',
          'projects.status as projectStatus',
          'projects.issueDate',
          'projects.expiryDate',
          'projects.revocationDate',
          'licenceHolder.firstName',
          'licenceHolder.lastName',
          'licenceHolder.email',
          'licenceHolder.telephone',
          'rops.year',
          'rops.status',
          'rops.procedures_completed',
          'rops.postnatal',
          'rops.endangered',
          'rops.endangered_details',
          'rops.nmbas',
          'rops.general_anaesthesia',
          'rops.general_anaesthesia_details',
          'rops.rodenticide',
          'rops.rodenticide_details',
          'rops.product_testing',
          'rops.product_testing_types'
        )
        .joinRelated('licenceHolder')
        .leftJoinRelated('rops')
        .whereRopsDue(key)
        .where(q => q.where('rops.year', key).orWhereNull('rops.year'))
        .toKnexQuery()
        .stream()
        .pipe(through.obj((record, enc, callback) => {
          meta.due++;
          if (!record.id) {
            record.procedure_count = 0;
            record.status = 'not started';
            return callback(null, record);
          }
          Procedure.query()
            .where({ ropId: record.id })
            .then(procs => {
              record.procedure_count = procs.length;
              if (record.status === 'submitted') {
                meta.submitted++;
                procs.forEach(p => {
                  p.subPurpose = getSubPurpose(p);
                  procedures.write(p);
                });
              }
            })
            .then(() => {
              callback(null, record);
            })
            .catch(callback);
        }))
        .pipe(projects)
        .on('end', () => procedures.end())
        .on('error', reject);

      const zip = archiver('zip');
      zip.append(establishments, { name: 'establishments.csv' });
      zip.append(projects, { name: 'returns.csv' });
      zip.append(procedures, { name: 'procedures.csv' });

      zip.on('error', reject);

      const params = {
        Bucket: s3.bucket,
        Body: zip,
        Key: id,
        ServerSideEncryption: s3.kms ? 'aws:kms' : undefined,
        SSEKMSKeyId: s3.kms
      };

      S3.upload(params, (err, result) => {
        err ? reject(err) : resolve({ ...meta, etag: result.ETag });
      });
      zip.finalize();

    });

  };
};
