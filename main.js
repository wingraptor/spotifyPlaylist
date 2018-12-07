const request = require("request");
const rp = require("request-promise");
const mongoose = require("mongoose");
const Album = require("./app.js");

//mongoose config
mongoose.connect(
  "mongodb://localhost:27017/spotify",
  { useNewUrlParser: true }
);

const name = "Hello";
const accessToken =
  "BQDdX7Te4boDgO66Kg_Qy0HdCgL-7CxEMztIuJYWY4qBkb_uLgWDjRjHtUdkGb_Kgj9w652EjUtSdb_Yy8P-q4rCI5y8IdTtlpAeTwko7OtiC8oHc0a_4tpbIh6wxY4X2Wuczd0do6kJSUm1gQOrDXiha0I4pbdsHZ7jSH75yhvchyVxTtjwEk5BgPBG_q57Od0oKA2mlF-puIDAMetN9jM";

  // Initial options to get user's Spotify ID
const options = {
  url: `https://api.spotify.com/v1/me`,
  headers: {
    Authorization: "Bearer " + accessToken
  },
  json: true // Automatically stringifies the body to JSON
};

/* --------------------------------------------------------

https://github.com/request/request-promise - for more info.

----------------------------------------------------------- */
// Get UserID
rp(options)
  .then(function(body) {
    // Update options object
    options.url = `https://api.spotify.com/v1/users/${body.id}/playlists`;
    options.method = "POST";
    options.body = {
      name: name,
      description:
        "Songs from the best 50 albums of 2018 according to Complex Mag.",
      public: false
    };
    // Create new playlist
    rp(options).then(function(body) {
      // Update options object
      options.url = `https://api.spotify.com/v1/playlists/${body.id}/tracks`;
      uriConstructor();
    });
  })
  .catch(function(err) {
    console.log(err);
  });


/*-------------------------------------------------------------------------------------------------------
Queries DB for trackIDs and constructs an array of track IDs (uris) 
- a max of 100 tracks can be added in POST request body
see here: https://developer.spotify.com/documentation/web-api/reference/playlists/add-tracks-to-playlist/
-------------------------------------------------------------------------------------------------------- */

function uriConstructor() {
  Album.find({}, "tracklist.track_id", function(err, val) {
    var count = 0;
    var tracksArray = [];

    for (var i = 0; i < val.length; i++) {
      for (var j = 0; j < val[i].tracklist.length; j++) {
        tracksArray.push(`spotify:track:${val[i].tracklist[j].track_id}`);
        count++;
        // Allow batches of 100 songs to be added to playlist
        if (count === 100) {
          addTracks(tracksArray);
          // Prepare for a new batch of tracks to be created
          tracksArray = [];
          count = 0;
        }
      }
    }
    // Allows batches of smaller than 100 tracks to be added to playlist
    addTracks(tracksArray);
  });
}

// Add batches of songs to Spotify playlist
function addTracks(arr, count) {
  // Add array to request body
  options.body = { uris: arr };
  // send request to add tracks to playlist
  rp(options)
    .then(function(body) {
      console.log("batch successfully added");
  })
    .catch(function(err){
      console.log(`Error adding tracks to playlist: ${err}`);
    })
}
