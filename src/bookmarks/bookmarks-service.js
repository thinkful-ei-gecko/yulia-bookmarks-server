'use strict';
const BookmarksService = {
  getAllBookmarks(knex) {
    return knex.select('*').from('bookmarks_data');
  },
  insertBookmark(knex, newBookmark) {
    return knex
      .insert(newBookmark)
      .into('bookmarks_data')
      .returning('*')
      .then(rows => {
        return rows[0];
      });
  },
  getById(knex, id) {
    return knex.from('bookmarks_data').select('*').where('id', id).first();
  },
  deleteBookmark(knex, id) {
    return knex('bookmarks_data')
      .where({ id })
      .delete();
  },
  updateBookmark(knex, id, newBookmarksFields) {
    return knex('bookmarks_data')
      .where({ id })
      .update(newBookmarksFields);
  }
};

module.exports = BookmarksService;