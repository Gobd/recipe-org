 - generate dewey decimal number automatically
 - add csv upload

on the main page the very bottom add a csv download link, this should return the output the api call getAllRecipes, things like tags that have multiple should be comma separated into a single col

also add files to the individual recipe page. should store in a different table with id autoinc, recipe id, filename, and blob content. can click on filename to download, can drag and drop into a box to upload or click an upload button. files are removed if recipe is removed. when recipe is returned it only includes file id and filename to generate a download link not the file contents.
