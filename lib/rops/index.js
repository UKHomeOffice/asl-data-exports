const through = require('through2');
const csv = require('csv-stringify');
const AWS = require('aws-sdk');
const archiver = require('archiver');
const { pick, flatten } = require('lodash');

const proceduresColumns = [
  { key: 'ropId', header: 'return_id' },
  { key: 'id', header: 'id' },
  { key: 'species', header: 'species' },
  { key: 'otherSpecies', header: 'other_species' },
  { key: 'severityNum', header: 'no_of_procedures' },
  { key: 'reuse', header: 'reuse' },
  { key: 'placesOfBirth', header: 'place_of_birth' },
  { key: 'nhpsOrigin', header: 'nhp_place_of_birth' },
  { key: 'nhpsColonyStatus', header: 'nhp_colony_status' },
  { key: 'nhpsGeneration', header: 'nhp_generation' },
  { key: 'ga', header: 'genetic_status' },
  { key: 'newGeneticLine', header: 'creation_of_new_genetic_line' },
  { key: 'purposes', header: 'purpose' },
  { key: 'subPurpose', header: 'sub_purpose' },
  { key: 'subPurposeOther', header: 'sub_purpose_other' },
  { key: 'regulatoryLegislation', header: 'testing_by_legislation' },
  { key: 'legislationOther', header: 'legislation_other' },
  { key: 'regulatoryLegislationOrigin', header: 'legislative_requirements' },
  { key: 'specialTechnique', header: 'technique_of_special_interest' },
  { key: 'severity', header: 'actual_severity' },
  { key: 'severityHoNote', header: 'comments_for_ho' },
  { key: 'severityPersonalNote', header: 'comments_for_personal_use' }
];

const returnsColumns = [
  'id',
  'licenceNumber',
  'establishmentId',
  'title',
  'projectStatus',
  'issueDate',
  'expiryDate',
  'revocationDate',
  'firstName',
  'lastName',
  'email',
  'telephone',
  'year',
  'status',
  'procedures_completed',
  'postnatal',
  'endangered',
  'endangered_details',
  'nmbas',
  'general_anaesthesia',
  'general_anaesthesia_details',
  'rodenticide',
  'rodenticide_details',
  'product_testing',
  'product_testing_types',
  'procedure_count'
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

const getSubPurposeOther = (rop, procedure) => {
  const subpurpose = getSubPurpose(procedure);

  const yeps = [
    'other',
    'routine-other',
    'qc-other',
    'other-efficacy',
    'other-toxicity-ecotoxicity',
    'other-toxicity'
  ];

  if (!yeps.includes(subpurpose)) {
    return null;
  }

  const id = procedure.subpurposeOther;

  if (!id) {
    return null;
  }

  const others = flatten([
    'basicSubpurposesOther',
    'regulatorySubpurposesOther',
    'regulatorySubpurposesQcOther',
    'regulatorySubpurposesOtherEfficacy',
    'regulatorySubpurposesOtherToxicityEcotoxicity',
    'regulatorySubpurposesOtherToxicity',
    'translationalSubpurposesOther'
  ].map(key => rop[key]));

  return (others.find(other => other && other.id === id) || {}).value;
};

function getLegislationOther(rop, procedure) {
  const purpose = procedure.purposes;
  if (purpose !== 'regulatory') {
    return null;
  }

  const subpurpose = procedure.regulatorySubpurposes;

  const nopes = [
    'routine-blood',
    'routine-monoclonal',
    'routine-other'
  ];

  if (nopes.includes(subpurpose)) {
    return null;
  }

  const id = procedure.legislationOther;

  if (!id) {
    return null;
  }

  return ((rop.regulatoryLegislationOther || []).find(opt => opt.id === id) || {}).value;
}

const getOtherSpeciesGroup = (ropSpecies, procedure) => {
  if (!ropSpecies) {
    return '';
  }
  if ((ropSpecies.otherSpecies || []).includes(procedure.species)) {
    return 'other-unspecified';
  }
  const otherSpeciesGroup = Object.keys(ropSpecies)
    .filter(key => key.includes('species-other-') && ropSpecies[key].includes(procedure.species))
    .pop();
  return (otherSpeciesGroup || '').replace('species-', ''); // "other-rodents" / "other-fish" / "other-reptiles" / etc
};

const normaliseBools = value => {
  if (value === true) {
    return 1;
  }
  if (value === false) {
    return 0;
  }
  return value;
};

const normalise = record => {
  Object.keys(record).forEach(key => {
    record[key] = normaliseBools(record[key]);
  });
  return record;
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
          'rops.*'
        )
        .joinRelated('licenceHolder')
        .leftJoinRelated('rops')
        .whereRopsDue(key)
        .where(q => q.where('rops.year', key).orWhereNull('rops.year'))
        .toKnexQuery()
        .stream()
        .pipe(through.obj((record, enc, callback) => {
          normalise(record);
          meta.due++;
          if (!record.id) {
            record.procedure_count = 0;
            record.status = 'not started';
            return callback(null, pick(record, returnsColumns));
          }
          Procedure.query()
            .where({ ropId: record.id })
            .then(procs => {
              record.procedure_count = procs.length;
              if (record.status === 'submitted') {
                meta.submitted++;
                procs.forEach(p => {
                  p.subPurpose = getSubPurpose(p);
                  p.subPurposeOther = getSubPurposeOther(record, p);
                  p.legislationOther = getLegislationOther(record, p);
                  const otherSpecies = getOtherSpeciesGroup(record.species, p);
                  if (otherSpecies) {
                    p.otherSpecies = p.species;
                    p.species = otherSpecies;
                  }
                  procedures.write(p);
                });
              }
            })
            .then(() => {
              callback(null, pick(record, returnsColumns));
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
