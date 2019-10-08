'use strict';
require('dotenv').config();
const { API_TOKEN } = require('./config');
const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const helmet = require('helmet');
const { NODE_ENV } = require('./config');
const logger = require('./logger');
const bookmarksRouter = require('./bookmarks/bookmarks-router');

const app = express();

const morganOption = (NODE_ENV === 'production')
  ? 'tiny' : 'common';

app.use(morgan(morganOption));
app.use(helmet());
app.use(cors());

app.use(function validateBearerToken(req, res, next) {
  const authToken = req.get('Authorization');
  if (!authToken || authToken.split(' ')[1] !== API_TOKEN) {
    logger.error(`Unauthorized request to path: ${req.path}`);
    return res.status(401).json({ error: 'Unauthorized request' })
  }

  next();
});

app.use('/api/bookmarks', bookmarksRouter);

app.use(function errorHandler(error, req, res, next) {//eslint-disable-line no-unused-vars
  let response;
  if (NODE_ENV === 'production') {
    response = { error: { message: 'server error' }};
  } else {
    logger.error(error.message);
    response = { message: error.message, error };
  }
  res.status(500).json(response);
});



module.exports = app;