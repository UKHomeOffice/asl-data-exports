const assert = require('assert');
const uuid = require('uuid').v4;
const Zip = require('jszip');
const { BufferListStream } = require('bl');
const parse = require('csv-parse/lib/sync');

const Builder = require('../../lib/exporters/rops');

const db = require('../helpers/db');

const PROFILE_ID = uuid();
const PROJECT_ID = uuid();
const ROP_ID = uuid();

describe('ROPs Exporter', () => {

  beforeEach(async () => {
    this.models = await db().init();

    // call export with params and read resulting ZIP file with `jszip`
    this.exportToZip = params => {
      let zipStream;

      const exporter = Builder({
        models: this.models,
        clients: {
          s3: ({ key, stream }) => {
            zipStream = stream;
            return Promise.resolve({ ETag: 'abc' });
          }
        }
      });

      return Promise.resolve()
        .then(() => {
          return exporter(params);
        })
        .then(() => {
          return new Promise((resolve, reject) => {
            zipStream.pipe(new BufferListStream((err, result) => err ? reject(err) : resolve(result)));
          });
        })
        .then(zip => {
          return Zip.loadAsync(zip);
        });
    };

    const { Establishment, Project, Procedure, Profile, Rop } = this.models;

    await Promise.resolve()
      .then(() => {
        return Establishment.query().insert({
          id: 100,
          name: 'Test Establishment'
        });
      })
      .then(() => {
        return Profile.query().insert({
          id: PROFILE_ID,
          firstName: 'Test',
          lastName: 'User',
          email: 'tu@example.com'
        });
      })
      .then(() => {
        return Project.query().insert([
          {
            id: PROJECT_ID,
            establishmentId: 100,
            licenceHolderId: PROFILE_ID,
            licenceNumber: 'PROJ0001',
            title: 'Test Project',
            status: 'active',
            issueDate: '2019-01-01T12:00:00.000Z',
            expiryDate: '2024-01-01T12:00:00.000Z'
          },
          {
            id: uuid(),
            establishmentId: 100,
            licenceHolderId: PROFILE_ID,
            licenceNumber: 'PROJ0002',
            title: 'Test Project 2',
            status: 'active',
            issueDate: '2019-01-01T12:00:00.000Z',
            expiryDate: '2024-01-01T12:00:00.000Z'
          },
          {
            id: uuid(),
            establishmentId: 100,
            licenceHolderId: PROFILE_ID,
            licenceNumber: 'PROJ0003',
            title: 'Test Project 3',
            status: 'revoked',
            issueDate: '2019-01-01T12:00:00.000Z',
            expiryDate: '2024-01-01T12:00:00.000Z',
            revocationDate: '2021-01-01T12:00:00.000Z'
          }
        ]);
      })
      .then(() => {
        return Rop.query().insert({
          id: ROP_ID,
          projectId: PROJECT_ID,
          year: 2021,
          status: 'submitted',
          purposes: ['basic'],
          basicSubpurposes: ['oncology']
        });
      })
      .then(() => {
        return Procedure.query().insert([
          {
            ropId: ROP_ID,
            species: 'mice',
            ga: 'false',
            purposes: 'basic',
            basicSubpurposes: 'oncology',
            newGeneticLine: false,
            severity: 'mild',
            severityNum: 100
          },
          {
            ropId: ROP_ID,
            species: 'mice',
            ga: 'false',
            purposes: 'basic',
            basicSubpurposes: 'oncology',
            newGeneticLine: false,
            severity: 'severe',
            severityNum: 200
          }
        ]);
      });

  });

  afterEach(() => {
    this.models.destroy();
  });

  describe('returns list', () => {

    beforeEach(() => {
      return this.exportToZip({ id: '1', key: 2021 })
        .then(result => {
          return result.file('returns.csv').async('string');
        })
        .then(csv => {
          return parse(csv, { columns: true });
        })
        .then(csv => {
          this.returns = csv;
        });
    });

    it('contains columns expected by stats team - DO NOT REMOVE OR CHANGE KEYS', () => {
      const expected = [
        'id',
        'licence_number',
        'establishment_id',
        'title',
        'project_status',
        'issue_date',
        'expiry_date',
        'revocation_date',
        'first_name',
        'last_name',
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
        'schedule_two_details',
        'procedure_count',
        'due_date',
        'submission_date'
      ];
      assert.deepEqual(Object.keys(this.returns[0]), expected);
    });

    it('loads project data into returns list', () => {
      assert.equal(this.returns.length, 3);

      const proj1 = this.returns.find(row => row.licence_number === 'PROJ0001');
      const proj2 = this.returns.find(row => row.licence_number === 'PROJ0002');
      const proj3 = this.returns.find(row => row.licence_number === 'PROJ0003');

      assert.equal(proj1.first_name, 'Test');
      assert.equal(proj1.last_name, 'User');
      assert.equal(proj1.status, 'submitted');
      assert.equal(proj1.procedure_count, '2');

      assert.equal(proj2.first_name, 'Test');
      assert.equal(proj2.last_name, 'User');
      assert.equal(proj2.status, 'not started');
      assert.equal(proj2.procedure_count, '0');

      assert.equal(proj3.revocation_date, '2021-01-01T12:00:00.000Z');
    });

  });

  describe('procedures list', () => {

    beforeEach(() => {
      return this.exportToZip({ id: '1', key: 2021 })
        .then(result => {
          return result.file('procedures.csv').async('string');
        })
        .then(csv => {
          return parse(csv, { columns: true });
        })
        .then(csv => {
          this.procedures = csv;
        });
    });

    it('contains columns expected by stats team - DO NOT REMOVE OR CHANGE KEYS', () => {
      const expected = [
        'return_id',
        'id',
        'species',
        'other_species',
        'no_of_procedures',
        'reuse',
        'place_of_birth',
        'nhp_place_of_birth',
        'nhp_colony_status',
        'nhp_generation',
        'genetic_status',
        'creation_of_new_genetic_line',
        'purpose',
        'sub_purpose',
        'sub_purpose_other',
        'testing_by_legislation',
        'legislation_other',
        'legislative_requirements',
        'technique_of_special_interest',
        'actual_severity',
        'comments_for_ho',
        'comments_for_personal_use',
        'ppl_number'
      ];
      assert.deepEqual(Object.keys(this.procedures[0]), expected);
    });

    it('maps sub-purposes to single column', () => {
      assert.equal(this.procedures[0].sub_purpose, 'oncology');
    });

  });

});
