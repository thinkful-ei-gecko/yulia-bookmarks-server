'use strict';
const express = require('express');
const xss = require('xss');
const { isWebUri } = require('valid-url');
const logger = require('../logger');
const BookmarksService = require('./bookmarks-service');
const path = require('path');


const bookmarksRouter = express.Router();
const bodyParser = express.json();

const serializeBookmark = bookmark => ({
  id: bookmark.id,
  title: xss(bookmark.title),
  url: xss(bookmark.url),
  description: xss(bookmark.description),
  rating: Number(bookmark.rating),
});

bookmarksRouter
  .route('/')
  .get((req, res, next) => {
    BookmarksService.getAllBookmarks(req.app.get('db'))
      .then(bookmarks => {
        res.json(bookmarks.map(serializeBookmark));
      })
      .catch(next);
  })
  .post(bodyParser, (req, res, next) => {
    const { title, url, description, rating } = req.body;
    const newBookmark = {title, url, description, rating };

    for (const field of ['title', 'url', 'rating']) {
      if (!req.body[field]) {
        logger.error(`${field} is required`);
        return res.status(400).send({
          error: { message: `'${field}' is required` }
        });
      }
    } 

    const ratingNum = Number(rating);

    if (!Number.isInteger(ratingNum) || ratingNum > 5 || ratingNum < 1) {
      return res.status(400).json({
        error: {message: '\'rating\' must be a number between 1 and 5'}
      });
    }

    if (!isWebUri(url)) {
      logger.error(`Invalid url '${url}' supplied`);
      return res.status(400).send({
        error: { message: '\'url\' must be a valid URL' }
      });
    }

    BookmarksService.insertBookmark(req.app.get('db'), newBookmark)
      .then( bookmark => {
        return res
          .status(201)
          .location(path.posix.join(req.originalUrl, `/${bookmark.id}`))
          .json(serializeBookmark(bookmark));
      })
      .catch(next);
  });


bookmarksRouter
  .route('/:bookmark_id')
  .all((req, res, next) => {
    const { bookmark_id } = req.params;
    BookmarksService.getById(req.app.get('db'), bookmark_id)
      //make sure we found a bookmark
      .then(bookmark => {
        if (!bookmark) {
          logger.error(`Bookmark with id ${req.params.id} not found.`);
          return res
            .status(404)
            .json({
              error: {message: 'Bookmark Not Found'}
            });
        }
        res.bookmark = bookmark;
        next();
      });
  })
  .get((req, res) => {
    res.json(serializeBookmark(res.bookmark));
  })    
  .delete((req, res, next) => {
    const { bookmark_id } = req.params;
    BookmarksService.deleteBookmark(
      req.app.get('db'),
      bookmark_id
    )
      .then(numRowsAffected => {
        logger.info(`Bookmark with id ${bookmark_id} deleted.`);
        res
          .status(204)
          .end();
      })
      .catch(next);   
  })
  .patch(bodyParser, (req, res, next) => {
    const { title, url, description, rating } = req.body;
    const bookmarkToUpdate = {title, url, description, rating };

    const numberOfValues = Object.values(bookmarkToUpdate).filter(Boolean).length;
    if (numberOfValues === 0) {
      return res.status(400).json({
        error: {
          message: 'Request body must contain either \'title\', \'url\', \'description\' or \'rating\''
        }
      });
    }

    BookmarksService.updateBookmark(
      req.app.get('db'),
      req.params.bookmark_id,
      bookmarkToUpdate
    )
      .then(numRowsAffected => {
        res.status(204).end();
      })
      .catch(next);
  })
;


module.exports = bookmarksRouter;