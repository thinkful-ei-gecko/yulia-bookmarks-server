'use strict';
const knex = require('knex');
const fixtures = require('./bookmarks-fixtures');
const app = require('../src/app');
const store = require('../src/store');

describe('Bookmarks Endpoints', function() {
  let db;

  before('make knex instance', () => {
    db = knex({
      client: 'pg',
      connection: process.env.TEST_DB_URL,
    });
    app.set('db', db);
  });

  after('disconnect from db', () => db.destroy());

  before('clean the table', () => db('bookmarks_data').truncate());

  afterEach('cleanup', () => db('bookmarks_data').truncate());


  describe('Unauthorized requests', () => {
    it('responds with 401 Unauthorized for GET a/bookmarks', () => {
      return supertest(app)
        .get('/api/bookmarks')
        .expect(401, { error: 'Unauthorized request' });
    });

    it('responds with 401 Unauthorized for POST a/bookmarks', () => {
      return supertest(app)
        .post('/api/bookmarks')
        .send({ title: 'test-title', url: 'http://some.thing.com', rating: 1 })
        .expect(401, { error: 'Unauthorized request' });
    });
    
    it('responds with 401 Unauthorized for GET a/bookmarks/:id', () => {
      const secondBookmark = store.bookmarks[1];
      return supertest(app)
        .get(`/api/bookmarks/${secondBookmark.id}`)
        .expect(401, { error: 'Unauthorized request' });
    });

    it('responds with 401 Unauthorized for DELETE a/bookmarks/:id', () => {
      const aBookmark = store.bookmarks[1];
      return supertest(app)
        .delete(`/api/bookmarks/${aBookmark.id}`)
        .expect(401, { error: 'Unauthorized request' });
    });
  });
   
  describe('GET /bookmarks', () => {
    context('Given no bookmarks', () => {
      it('responds with 200 and an empty list', () => {
        return supertest(app)
          .get('/api/bookmarks')
          .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
          .expect(200, []);
      });
    });

    context('Given there are bookmarks in the database', () => {
      const testBookmarks = fixtures.makeBookmarksArray();

      beforeEach('insert bookmarks', () => {
        return db
          .into('bookmarks_data')
          .insert(testBookmarks);
      });

      it('gets the bookmarks from the store', () => {
        return supertest(app)
          .get('/api/bookmarks')
          .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
          .expect(200, testBookmarks);
      });
    });
  });
  
  describe('GET /bookmarks/:id', () => {
    context('Given no bookmarks', () => {
      it('responds 404 whe bookmark doesn\'t exist', () => {
        return supertest(app)
          .get('/api/bookmarks/123')
          .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
          .expect(404, {
            error: { message: 'Bookmark Not Found' }
          });
      });
    });

    context('Given there are bookmarks in the database', () => {
      const testBookmarks = fixtures.makeBookmarksArray();

      beforeEach('insert bookmarks', () => {
        return db
          .into('bookmarks_data')
          .insert(testBookmarks);
      });

      it('responds with 200 and the specified bookmark', () => {
        const bookmarkId = 2;
        const expectedBookmark = testBookmarks[bookmarkId - 1];
        return supertest(app)
          .get(`/api/bookmarks/${bookmarkId}`)
          .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
          .expect(200, expectedBookmark);
      });
    });
  });

  describe('DELETE /bookmarks/:id', () => {
    context('Given no bookmarks', () => {
      it('responds 404 whe bookmark doesn\'t exist', () => {
        return supertest(app)
          .delete('/api/bookmarks/123')
          .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
          .expect(404, {
            error: { message: 'Bookmark Not Found' }
          });
      });
    });

    context('Given there are bookmarks in the database', () => {
      const testBookmarks = fixtures.makeBookmarksArray();

      beforeEach('insert bookmarks', () => {
        return db
          .into('bookmarks_data')
          .insert(testBookmarks);
      });

      it('removes the bookmark by ID from the store', () => {
        const idToRemove = 2;
        const expectedBookmarks = testBookmarks.filter(bm => bm.id !== idToRemove);
        return supertest(app)
          .delete(`/api/bookmarks/${idToRemove}`)
          .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
          .expect(204)
          .then(() =>
            supertest(app)
              .get('/api/bookmarks')
              .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
              .expect(expectedBookmarks)
          );
      });
    });
  });

  describe('PATCH /api/bookmarks/:bookmark_id', () => {
    context('Given no bookmarkss', () => {
      it('responds with 404', () => {
        const bookmarkId = 123456;
        return supertest(app)
          .patch(`/api/bookmarks/${bookmarkId}`)
          .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
          .expect(404, { error: { message: 'Bookmark Not Found' } });
      });
    });
  

    context('Given there are bookmarks in the database', () => {
      const testBookmarks = fixtures.makeBookmarksArray();
      
      beforeEach('insert bookmarks', () => {
        return db
          .into('bookmarks_data')
          .insert(testBookmarks);
      });

      it(`responds with 400 when no required fields supplied`, () => {
        const idToUpdate = 2
        return supertest(app)
          .patch(`/api/bookmarks/${idToUpdate}`)
          .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
          .send({ irrelevantField: 'foo' })
          .expect(400, {
            error: {
              message: `Request body must contain either 'title', 'url', 'description' or 'rating'`
            }
          })
      })
      
      it('responds with 204 and updates the bookmark', () => {
        const idToUpdate = 2;
        const updateBookmark = {
          title: 'updated bookmark title',
          url: 'https://updated-url.com',
          description: 'updated article description',
          rating: 1
        };
        const expectedBookmark = {
          ...testBookmarks[idToUpdate - 1],
          ...updateBookmark
        }
        return supertest(app)
          .patch(`/api/bookmarks/${idToUpdate}`)
          .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
          .send(updateBookmark)
          .expect(204)
          .then(res =>
            supertest(app)
              .get(`/api/bookmarks/${idToUpdate}`)
              .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
              .expect(expectedBookmark)
              )
      });

      it(`responds with 204 when updating only a subset of fields`, () => {
        const idToUpdate = 2
        const updateBookmark = {
          title: 'updated bookmark title',
        }
        const expectedBookmark = {
          ...testBookmarks[idToUpdate - 1],
          ...updateBookmark
        }

        return supertest(app)
          .patch(`/api/bookmarks/${idToUpdate}`)
          .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
          .send({
            ...updateBookmark,
            fieldToIgnore: 'should not be in GET response'
          })
          .expect(204)
          .then(res =>
            supertest(app)
              .get(`/api/bookmarks/${idToUpdate}`)
              .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
              .expect(expectedBookmark)
          )
      })
    })
  });

  describe('POST /bookmarks', () => {
    it('responds with 400 missing \'title\' if not supplied', () => {
      const newBookmarkMissingTitle = {
        // title: 'test-title',
        url: 'https://test.com',
        rating: 1,
      };
      return supertest(app)
        .post('/api/bookmarks')
        .send(newBookmarkMissingTitle)
        .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
        .expect(400, {
          error: {message: '\'title\' is required'}
        });
    });

    it('responds with 400 missing \'url\' if not supplied', () => {
      const newBookmarkMissingUrl = {
        title: 'test-title',
        // url: 'https://test.com',
        rating: 1,
      };
      return supertest(app)
        .post('/api/bookmarks')
        .send(newBookmarkMissingUrl)
        .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
        .expect(400, {
          error: {message: '\'url\' is required'}
        });
    });

    it('responds with 400 missing \'rating\' if not supplied', () => {
      const newBookmarkMissingRating = {
        title: 'test-title',
        url: 'https://test.com',
        // rating: 1,
      };
      return supertest(app)
        .post('/api/bookmarks')
        .send(newBookmarkMissingRating)
        .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
        .expect(400, {
          error: {message: '\'rating\' is required'}
        });
    });

    it('responds with 400 invalid \'rating\' if not between 1 and 5', () => {
      const newBookmarkInvalidRating = {
        title: 'test-title',
        url: 'https://test.com',
        rating: 'invalid',
      };
      return supertest(app)
        .post('/api/bookmarks')
        .send(newBookmarkInvalidRating)
        .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
        .expect(400, {
          error: {message: '\'rating\' must be a number between 1 and 5' }
        });
    });

    it('responds with 400 invalid \'url\' if not a valid URL', () => {
      const newBookmarkInvalidUrl = {
        title: 'test-title',
        url: 'htp://invalid-url',
        rating: 1,
      };
      return supertest(app)
        .post('/api/bookmarks')
        .send(newBookmarkInvalidUrl)
        .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
        .expect(400, {
          error: {message: '\'url\' must be a valid URL'}
        });
    });

    it('adds a new bookmark to the database', () => {
      const newBookmark = {
        title: 'test-title',
        url: 'https://test.com',
        description: 'test description',
        rating: 1,
      };

      return supertest(app)
        .post('/api/bookmarks')
        .send(newBookmark)
        .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
        .expect(201)
        .expect(res => {
          expect(res.body.title).to.eql(newBookmark.title);
          expect(res.body.url).to.eql(newBookmark.url);
          expect(res.body.description).to.eql(newBookmark.description);
          expect(res.body.rating).to.eql(newBookmark.rating);
          expect(res.body).to.have.property('id');
          expect(res.headers.location).to.eql(`/api/bookmarks/${res.body.id}`);
        })
        .then(res => 
          supertest(app)
            .get(`/api/bookmarks/${res.body.id}`)
            .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
            .expect(res.body)
        );
    });

    it('removes XSS attack content from response', () => {
      const { maliciousBookmark, expectedBookmark } = fixtures.makeMaliciousBookmark();
      return supertest(app)
        .post('/api/bookmarks')
        .send(maliciousBookmark)
        .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
        .expect(201)
        .expect(res => {
          expect(res.body.title).to.eql(expectedBookmark.title);
          expect(res.body.description).to.eql(expectedBookmark.description);
        });
    });
  });
});
