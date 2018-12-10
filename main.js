const request = require("request");
const rp = require("request-promise");
const mongoose = require("mongoose");
const ejs = require("ejs");
const express = require("express");
const queryString = require("query-string");
const cookieParser = require("cookie-parser");
const Album = require("./app.js");

//mongoose config
mongoose.connect(
  "mongodb://localhost:27017/spotify",
  { useNewUrlParser: true }
);

//EJS + Express config
var app = express();
app.set("view engine", "ejs");
app.use(cookieParser());

const name = "Test2";

//Spotify config
const client_id = "624b38195d6f486f9b290e99fc6e8b91"; // Spotify client id
const client_secret = "0c2a75363bdf49cda33db3c4fde553d9"; // Spotify secret
const redirect_uri = "http://localhost:3000/callback";
const stateKey = "spotify_auth_state";

// Generates random string containing letters and numbers
const generateRandomString = function(length) {
  var text = "";
  var possible =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

  for (var i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
};

// Options to pass to various HTTP requests to Spotify APIS
const options = {
  url: `https://api.spotify.com/v1/me`,
  json: true // Automatically stringifies the body to JSON
};

app.get("/", function(req, res) {
  res.render("home.ejs");
});


/*--------------------------------------------------------------------------------------------------------------
Implement Spotify Authorization Code Flow: 
see here: https://developer.spotify.com/documentation/general/guides/authorization-guide/#authorizaton-code-flow
https://github.com/spotify/web-api-auth-examples/blob/master/authorization_code/app.js
----------------------------------------------------------------------------------------------------------------- */


app.get("/login", function(req, res) {
  const state = generateRandomString(16);
  res.cookie(stateKey, state); // generate cookie in the form: "stateKey:state"

  //Requests user authentication
  var scope =
    "playlist-modify-public playlist-modify-private user-read-private";
  res.redirect(
    "https://accounts.spotify.com/authorize?" +
      // returns a query string in the format - "response_type=code?client_id=clientID"
      queryString.stringify({
        response_type: "code",
        client_id: client_id,
        scope: scope,
        redirect_uri: redirect_uri,
        state: state
      })
  );
});

// Defines route which is redirected to after user authorization from the /login route
app.get("/callback", function(req, res) {
  // your application requests refresh and access tokens
  // after checking the state parameter

  // Get request parameters sent by spotify through the redirect in /login route
  var code = req.query.code || null;
  var state = req.query.state || null;
  var storedState = req.cookies ? req.cookies[stateKey] : null; // access the stateKey value from the req.cookies object

  //  Ensure that state exists and that statekey returned is the same as the stateStored
  if (state === null || state !== storedState) {
    res.redirect(
      "/#" +
        queryString.stringify({
          error: "state_mismatch"
        })
    );
  } else {
    res.clearCookie(stateKey);

    var authOptions = {
      url: "https://accounts.spotify.com/api/token",
      form: {
        code: code,
        redirect_uri: redirect_uri,
        grant_type: "authorization_code"
      },
      headers: {
        "Authorization":
          "Basic " +
          Buffer.from(`${client_id}:${client_secret}`).toString("base64") //https://nodejs.org/api/buffer.html#buffer_class_method_buffer_from_string_encoding
      },
      json: true
    };
    // Send request to get access token and refresh token
    rp.post(authOptions)
      .then(function(body) {
        var access_token = body.access_token,
          refresh_token = body.refresh_token;

        // Set the access token 
        options.headers = { Authorization: `Bearer ${access_token}` };
        /*--------------------------------------------------------
        
        https://github.com/request/request-promise - for more info.
        
        -----------------------------------------------------------*/
        // Get UserID
        rp(options)
          .then(function (body) {
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
            rp(options)
              .then(function (body) {
                // Update options object with endpoint to add tracks to playlist
                options.url = `https://api.spotify.com/v1/playlists/${body.id}/tracks`;
                uriConstructor();
            })
              .then(function(){
                res.send("Complete");
              });
          })
          .catch(function (err) {
            console.log(err);
          });
      })
      .catch(function(err){
        res.redirect('/#' +
          queryString.stringify({
            error: 'invalid_token'
          }));
      });
  }
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
function addTracks(arr) {
  // Add array to request body
  options.body = { uris: arr };
  // send request to add tracks to playlist
  rp(options)
    .then(function(body) {
      console.log("batch successfully added");
    })
    .catch(function(err) {
      console.log(`Error adding tracks to playlist: ${err}`);
    });
}

//Tell Express to listen for requests on port 3000 (starts local server)
//Visit localhost:3000 to reach site being served by local server.
app.listen(3000, function() {
  //Logs "Server has started" to the console when server has been started
  console.log("Server has started");
});
