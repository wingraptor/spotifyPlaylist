const $ = require("cheerio");
const puppeteer = require("puppeteer");
const mongoose = require("mongoose");
const url =
  "https://www.complex.com/music/best-albums-2018/mariah-carey-caution";

//Spotify config
const client_id = "624b38195d6f486f9b290e99fc6e8b91"; // Spotify client id
const client_secret = "84ebfb41b6414d5095323ec09a7aa8a6"; // Spotify secret
const accessToken =
  "BQCAMlMUonAx-k-_pSttqVKxXG5TJsGOiejfgT7MB6tRjRK5Qm7FmPpPbVQH4T9lN8NvjoNbGv8SLqvrOiDY3HAOelLUnkS9UPbhk4obX9IKaVrxIeM2t5sY-1i_uTruy8eP1AIle7HgXiC8PIQwZSKb5cUHMqqL9g2AU8ayp7YSJN0"; //Spotify access token
const albumArtistArr = [];

//mongoose config
mongoose.connect(
  "mongodb://localhost:27017/spotify",
  { useNewUrlParser: true }
);

//Database Config
var albumSchema = new mongoose.Schema({
  pageData: String,
  name: String,
  artist: String,
  album_id: String,
  tracklist: [{ track_id: String, name: String, track_number: Number }]
});

var Album = mongoose.model("Album", albumSchema);

// Parse data from website to get list of albums to add to Album collection - https://www.complex.com/music/best-albums-2018
puppeteer
  .launch()
  .then(function(browser) {
    return browser.newPage();
  })
  .then(function(page) {
    return page.goto(url).then(function() {
      return page.content();
    });
  })
  .then(function(html) {
    //Select markup on page containing artist and album names.
    const albumArtistHTML = $(".list-slide__title", html);
    //Add artist, album and position of each album to an array
    albumArtistHTML.each(function() {
      albumArtistArr.push($(this).text());
    });
    // Extract album names and add to database - https://stackoverflow.com/questions/12367126/how-can-i-get-a-substring-located-between-2-quotes
    albumArtistArr.forEach(function(e) {
      Album.create({
        name: e.match(/‘([^']+)’/)[1]
      });
    });
  })
  .catch(function(err) {
    //handle error
    console.log(err);
  });


var options = {
  url: `https://api.spotify.com/v1/search?q=${albums[i].name}&type=album&market=US&limit=1&offset=0`,
  headers: {
    Authorization: "Bearer " + accessToken
  },
  json: true // Automatically stringifies the body to JSON
};

//Add Spotify Album IDs and artist names to album documents
Album.find({}, function(err, albums) {
  if (err) {
    console.log(err);
  } else {
    //Iterate through the array of queried albums
    for (var i = 0; i < albums.length; i++) {
      //Update url to match 
      options.url = `https://api.spotify.com/v1/search?q=${albums[i].name}&type=album&market=US&limit=1&offset=0`
      //Send search request to spotify for each album - options.url
      request.get(options, function(error, response, body) {
        //Search for specific album and add album id and artist name received from Spotify query
        Album.findOneAndUpdate(
          { name: /body.albums.items[0].name/i},
          {
            album_id: body.albums.items[0].id,
            artist: body.albums.items[0].artists[0].name
          },
          function(err) {
            if (err) {
              console.log(err);
            }
            else {
              console.log("Album data added successfully");
            }
          }
        );
      });
    }
  }
});

// Add tracklists to album documents
Album.find({}, function(err, albums) {
  if (err) {
    console.log(err);
  } else {
    //Iterate through the array of queried albums
    for (var i = 0; i < albums.length; i++) {
      //Construct URL to get album's tracklist
      options.url = `https://api.spotify.com/v1/albums/${albums[i].album_id}/tracks`;
      //Send request to spotify for tracklist of album
      request.get(options, function(error, response, body) {
        //Generate array of track names, ids and track numbers
        var tracklist = [];
        for (var j = 0; j < body.items.length; j++){
          tracklist[j] = {
            track_id: body.items[j].id,
            name: body.items[j].name,
            track_number: body.items[j].track_number
          }
        };
        //Update found album with album id and artist name from Spotify
        Album.findOneAndUpdate(
          { artist: body.items[0].artists[0].name },
          {
            tracklist: tracklist
          },
          function(err, albums) {
            if (err) {
              console.log(err);
            }
          }
        );
      });
    }
  }
});

module.exports = Album;
