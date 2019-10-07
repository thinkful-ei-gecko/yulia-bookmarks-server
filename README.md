# Bookmarks API

- Add an endpoint to support updating bookmarks using a PATCH request

- Ensure the Bookmarks API has a uniform RESTful interface. For example, are the endpoints consistently named?

- Update all of the endpoints to use the /api prefix

- Write integration tests for your PATCH request to ensure:

  1. It requires the bookmark's ID to be supplied as a URL param

  2. It responds with a 204 and no content when successful

  3. It updates the bookmark in your database table

  4. It responds with a 400 when no values are supplied for any fields (title, url, description, rating)

  5. It allows partial updates, for example, only supplying a new title will only update the title for that item

- Write the appropriate API code to make these tests pass