const through = require('through2');
const csv = require('csv-stringify');
const archiver = require('archiver');
const { pick, flatten } = require('lodash');

const snakeCase = require('../utils/snake-case');

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
  { key: 'severityPersonalNote', header: 'comments_for_personal_use' },
  { key: 'licenceNumber', header: 'ppl_number' }
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
  'proceduresCompleted',
  'postnatal',
  'endangered',
  'endangeredDetails',
  'nmbas',
  'generalAnaesthesia',
  'generalAnaesthesiaDetails',
  'rodenticide',
  'rodenticideDetails',
  'scheduleTwoDetails',
  'procedureCount',
  'dueDate',
  'submissionDate'
];

const nilReturnsColumns = [
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
  'proceduresCompleted',
  'postnatal',
  'procedureCount',
  'dueDate',
  'submissionDate'
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
    'other-toxicity-lethal',
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
    'regulatorySubpurposesOtherToxicityLethal',
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
  record.dueDate = record.ropsDeadline;
  record.submissionDate = record.submittedDate;
  Object.keys(record).forEach(key => {
    record[key] = normaliseBools(record[key]);
  });
  return record;
};

const normaliseSpecies = procedure => {
  // Xenopus laevis are incorrectly coded as 'common-frogs', where they should be 'african-frogs'.
  // Correct this on any procedures which have 'common-frogs'
  if (procedure.species === 'common-frogs') {
    procedure.species = 'african-frogs';
  }
};

module.exports = ({ s3Upload, models }) => {
  const { Establishment, Project, Procedure } = models;

  return ({ id, key }) => {

    return new Promise((resolve, reject) => {

      const establishments = csv({ header: true });
      const projects = csv({ header: true, columns: returnsColumns.map(key => ({ key, header: snakeCase(key) })) });
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
        .selectRopsDeadline(key)
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
            record.procedureCount = 0;
            record.status = 'not started';
            return callback(null, pick(record, returnsColumns));
          }

          Procedure.query()
            .where({ ropId: record.id })
            .then(procs => {
              record.procedureCount = procs.length;
              if (record.status === 'submitted') {
                meta.submitted++;
                procs.forEach(p => {
                  p.subPurpose = getSubPurpose(p);
                  p.subPurposeOther = getSubPurposeOther(record, p);
                  p.legislationOther = getLegislationOther(record, p);
                  p.licenceNumber = record.licenceNumber;
                  normaliseSpecies(p);
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
              const data = (!record.proceduresCompleted || !record.postnatal)
                ? pick(record, nilReturnsColumns)
                : pick(record, returnsColumns);
              callback(null, data);
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

      s3Upload({ key: id, stream: zip })
        .then(result => resolve({ ...meta, etag: result.ETag }))
        .catch(reject);

      zip.finalize();

    });

  };

};
