const request = require("request");
const rp = require("request-promise");
const mongoose = require("mongoose");
const ejs = require("ejs");
const express = require("express");
const Album = require("./app.js");

//mongoose config
mongoose.connect(
  "mongodb://localhost:27017/spotify",
  { useNewUrlParser: true }
);

//EJS + Express config
var app = express();
app.set("view engine", "ejs");

const name = "Hello";

//Spotify config
const my_client_id = "624b38195d6f486f9b290e99fc6e8b91"; // Spotify client id
const client_secret = "84ebfb41b6414d5095323ec09a7aa8a6"; // Spotify secret
const accessToken = "";
const redirect_uri = "http://localhost:3000/";

  // Initial options to get user's Spotify ID
const options = {
  url: `https://api.spotify.com/v1/me`,
  headers: {
    Authorization: "Bearer " + accessToken
  },
  json: true // Automatically stringifies the body to JSON
};


app.get("/", function(req,res){
  res.render("home.ejs");
});

app.get("/login", function(req,res){
  var scopes = "playlist-modify-public playlist-modify-private user-read-private";
  res.redirect('https://accounts.spotify.com/authorize' +
    '?response_type=code' +
    '&client_id=' + my_client_id +
    (scopes ? '&scope=' + encodeURIComponent(scopes) : '') +
    '&redirect_uri=' + encodeURIComponent(redirect_uri));
});

app.get("post", function (req, res) {
  res.render("home.ejs");
});

/*--------------------------------------------------------

https://github.com/request/request-promise - for more info.

-----------------------------------------------------------*/
// Get UserID
// rp(options)
//   .then(function(body) {
//     // Update options object
//     options.url = `https://api.spotify.com/v1/users/${body.id}/playlists`;
//     options.method = "POST";
//     options.body = {
//       name: name,
//       description:
//         "Songs from the best 50 albums of 2018 according to Complex Mag.",
//       public: false
//     };
//     // Create new playlist
//     rp(options).then(function(body) {
//       // Update options object
//       options.url = `https://api.spotify.com/v1/playlists/${body.id}/tracks`;
//       uriConstructor();
//     });
//   })
//   .catch(function(err) {
//     console.log(err);
//   });


/*-------------------------------------------------------------------------------------------------------
Queries DB for trackIDs and constructs an array of track IDs (uris) 
- a max of 100 tracks can be added in POST request body
see here: https://developer.spotify.com/documentation/web-api/reference/playlists/add-tracks-to-playlist/
-------------------------------------------------------------------------------------------------------- */

// function uriConstructor() {
//   Album.find({}, "tracklist.track_id", function(err, val) {
//     var count = 0;
//     var tracksArray = [];

//     for (var i = 0; i < val.length; i++) {
//       for (var j = 0; j < val[i].tracklist.length; j++) {
//         tracksArray.push(`spotify:track:${val[i].tracklist[j].track_id}`);
//         count++;
//         // Allow batches of 100 songs to be added to playlist
//         if (count === 100) {
//           addTracks(tracksArray);
//           // Prepare for a new batch of tracks to be created
//           tracksArray = [];
//           count = 0;
//         }
//       }
//     }
//     // Allows batches of smaller than 100 tracks to be added to playlist
//     addTracks(tracksArray);
//   });
// }

// // Add batches of songs to Spotify playlist
// function addTracks(arr, count) {
//   // Add array to request body
//   options.body = { uris: arr };
//   // send request to add tracks to playlist
//   rp(options)
//     .then(function(body) {
//       console.log("batch successfully added");
//   })
//     .catch(function(err){
//       console.log(`Error adding tracks to playlist: ${err}`);
//     });
// }


//Tell Express to listen for requests on port 3000 (starts local server)
//Visit localhost:3000 to reach site being served by local server.
app.listen(3000, function () {
  //Logs "Server has started" to the console when server has been started
  console.log("Server has started");
});