'use strict';
const express = require('express');
const uuid = require('uuid/v4');
const logger = require('../logger');
const { bookmarks } = require('../store');

const cardRouter = express.Router();
const bodyParser = express.json();

cardRouter
  .route('/')
  .get((req, res) => {
    res.json(bookmarks);
  });

cardRouter
  .route('/:bookmarkId')
  .get((req, res) => {
    const { id } = req.params;
    const bookmark = bookmarks.find(c => c.id == id);
    //make sure we found a card
    if (!bookmark) {
      logger.error(`Card with id ${id} not found.`);
      return res
        .status(404)
        .send('Card Not Found');
    }
    res.json(bookmark);
  })
  .delete((req, res) => {
    
    res
      .status(204)
      .end();
  });

module.exports = cardRouter;