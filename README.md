# Best Tracks of 2018 Spotify Playlist Generator

This is a web app that creates a Spotify playlist containing tracks from the best 50 albums of 2018 according to [Complex Magazine](https://www.complex.com/music/best-albums-2018/). The Complex Magazine article was parsed for the album names which were then used, via various queries to Spotify APIs, to generate a database of tracks, Spotify track/album IDs, artist names etc. for all 50 albums. This database is then queried to generate a private Spotify playlist of >700 tracks after appropriate authorizations are granted through logging into your account.

## Getting Started

Visit [https://spotifyplaylistapp.herokuapp.com/](https://spotifyplaylistapp.herokuapp.com/) and click the 'Get Tracks' button to give this app the necessary permissions to create the playlist and add tracks. 

You can also visit the [albums page](https://spotifyplaylistapp.herokuapp.com/albums) to see a sorted list (highest to lowest) of albums, their respective spotify links and their tracklists.

### Prerequisites / Permissions Granted

All you need is Spotify Account and you're good to go!

The permissions granted to allow this app to work are as follows:

* [user-read-private](https://developer.spotify.com/documentation/general/guides/scopes/#user-read-private) - allows app to create the playlist for the logged in user.
* [playlist-modify-private](https://developer.spotify.com/documentation/general/guides/scopes/#playlist-modify-private) - allows app to create a private playlist and to add tracks to private playlist.
* [playlist-modify-public](https://developer.spotify.com/documentation/general/guides/scopes/#playlist-modify-public) - allows app to create a pbulic playlist and to add tracks to public playlist.


## Built With 

* [Node.js](https://nodejs.org/en/) - Server environment used
* [Express](https://expressjs.com/) - Web app Framework used
* [EJS](https://ejs.co/) - Templating Language used
* [PaperCSS](https://www.getpapercss.com/) - CSS Framework used
* [Mongoose](https://mongoosejs.com/) - Mongodb object modeling for node.js
* [Mongolabs](https://mlab.com/) - MongoDB hosting service
* [Heroku](https://www.heroku.com/home) - Web app hosting platform used

## Authors

* **[Akono Brathwaite](https://www.akonobrathwaite.com)**
