const cookieParser = require("cookie-parser"),
      queryString  = require("query-string"),
      mongoose     = require("mongoose"),
      express      = require("express"),
      request      = require("request"),
      Album        = require("./models/albums.js"),
      ejs          = require("ejs"),
      rp           = require("request-promise");



//Environment variable setup
require("dotenv").config();
const port = process.env.PORT || 3000;
const IP = process.env.IP || "";
const databaseUrl = process.env.DATABASE_URL || "mongodb://localhost:27017/spotify";


//mongoose config
mongoose.connect(
  databaseUrl,
  { useNewUrlParser: true }
);

//EJS + Express config
const app = express();
app.set("view engine", "ejs");
app.use(cookieParser());
app.use(express.static(__dirname + "/public"));

//Spotify config
const client_id = process.env.CLIENT_ID; // Spotify client id
const client_secret = process.env.CLIENT_SECRET; // Spotify secret
const redirect_uri = process.env.REDIRECT_URI || "http://localhost:3000/callback";
const stateKey = "spotify_auth_state";
// var trackCount = 0;

// Generates random string containing letters and numbers
const generateRandomString = function (length) {
  var text = "";
  var possible =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

  for (var i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
};

app.get("/", function (req, res) {
  res.render("home");

});

// Loads Page to display all albums - sorted in ascending order according to their position in Top50
app.get("/albums", function(req,res){
  Album.find({}, null, { sort: { position: "ascending"}},function (err, albums) {
    if (err) {
      console.log(err);
    }
    else {
      res.render("albums", { albums: albums});
    }
  });
});

// Loads Page to display all albums and number of tracks sucessfully added
// app.get("/albums/added", function (req, res) {
//   Album.find({}, function (err, albums) {
//     if (err) {
//       console.log(err);
//     }
//     else {
//       res.render("albumsAdded", { albums: albums, trackCount: trackCount });
//     }
//     trackCount = 0;
//   });
// });


/*--------------------------------------------------------------------------------------------------------------
Implement Spotify Authorization Code Flow: 
see here: https://developer.spotify.com/documentation/general/guides/authorization-guide/#authorizaton-code-flow
https://github.com/spotify/web-api-auth-examples/blob/master/authorization_code/app.js
----------------------------------------------------------------------------------------------------------------- */


app.get("/login", function (req, res) {
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
app.get("/callback", function (req, res) {
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
      .then(function (body) {
        var access_token = body.access_token,
          refresh_token = body.refresh_token;

        /*--------------------------------------------------------
                              Get UserID
        https://github.com/request/request-promise - for more info.
        -----------------------------------------------------------*/

        // Options to be passed to get UserID
        var userOptions = {
          url: `https://api.spotify.com/v1/me`,
          json: true, // Automatically stringifies the body to JSON
          headers:{
            Authorization: `Bearer ${access_token}` // Set the access token received from post request to https://accounts.spotify.com/api/token
          }
        };
        //Call to get UserID in body of response
        rp(userOptions)
          .then(function (user) {

            // Options to be passed to Create Playlist
            var playlistOptions = {
              url: `https://api.spotify.com/v1/users/${user.id}/playlists`, //body.id is the userID received 
              method: "POST",
              body: {
                name: "Top Tracks of 2018",
                description:
                  "Songs from the best 50 albums of 2018 according to Complex Mag.",
                public: false               
              },
              json: true, // Automatically stringifies the body to JSON
              headers: {
                Authorization: `Bearer ${access_token}` // Set the access token received from post request to https://accounts.spotify.com/api/token
              }
            };

            /*---------------------------
                Create new playlist
            -----------------------------*/
            rp(playlistOptions)
              .then(function (playlist) {
                var addTracksOptions = {
                  url: `https://api.spotify.com/v1/playlists/${playlist.id}/tracks`,
                  method: "POST",
                  json: true, // Automatically stringifies the body to JSON,
                  headers: {
                    Authorization: `Bearer ${access_token}` // Set the access token received from post request to https://accounts.spotify.com/api/token
                  }
                }
                uriConstructor(addTracksOptions);
                //Page rendered with link to created playlist
                Album.find({}, null, { sort: { position: "ascending" } }, function (err, albums) {
                  if (err) {
                    console.log(err);
                  }
                  else {
                    res.render("albumsAdded", { albums: albums, playlist:playlist });
                  }
                });
              })
              .catch(function (err) {
                console.log(err);
              });
          })
          .catch(function (err) {
            console.log(err);
          });
      })
      .catch(function (err) {
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

function uriConstructor(addTracksOptions) {
  Album.find({}, "tracklist.track_id", function (err, val) {
    var count = 0;
    var tracksArray = [];

    for (var i = 0; i < val.length; i++) {
      for (var j = 0; j < val[i].tracklist.length; j++) {
        tracksArray.push(`spotify:track:${val[i].tracklist[j].track_id}`);
        count++;
        // Allow batches of 100 songs to be added to playlist
        if (count === 100) {
          addTracks(tracksArray, addTracksOptions);
          // Prepare for a new batch of tracks to be created
          tracksArray = [];
          count = 0;
        }
      }
    }
    // Allows batches of smaller than 100 tracks to be added to playlist
    addTracks(tracksArray, addTracksOptions);
  });
}

// Add batches of songs to Spotify playlist
function addTracks(arr, addTracksOptions) {
  // Add array to request body
  addTracksOptions.body = { uris: arr };
  // send request to add tracks to playlist
  rp(addTracksOptions)
    .then(function (body) {
      console.log("batch successfully added");
      //Count Number of track successfully added to playlist
      // if (arr.length % 100 === 0){
      //     trackCount += 100;
      // }
      // else {
      //   trackCount += arr.length % 100;
      // }
    })
    .catch(function (err) {
      console.log(`Error adding tracks to playlist: ${err}`);
    });
}

//Tell Express to listen for requests on port 3000 (starts local server)
//Visit localhost:3000 to reach site being served by local server.
app.listen(port, IP, function () {
  //Logs "Server has started" to the console when server has been started
  console.log("Server has started");
});
