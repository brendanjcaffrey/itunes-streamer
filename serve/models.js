function fixSortName(model) {
  model.sortName = model.sortName == "" ? model.name : model.sortName;
}

function secondsToTime(seconds) {
  var min = Math.floor(Math.ceil(seconds) / 60);
  var sec = Math.ceil(seconds) % 60;
  return String(min) + ":" + (sec < 10 ? "0" : "") + String(sec);
}

function extToType(ext) {
  switch (ext) {
    case 'mp3':  return 'audio/mpeg';
    case 'mp4':  return 'audio/mp4';
    case 'm4a':  return 'audio/mp4';
    case 'aif':  return 'audio/aif';
    case 'aiff': return 'audio/aif';
    case 'wav':  return 'audio/wav';
  }
}

var GenreIndices = ["id", "name"];
var ArtistIndices = ["id", "name", "sortName"];
var AlbumIndices = ["id", "artistId", "name", "sortName"];
var TrackIndices = ["id", "name", "sortName", "artistId", "albumId", "genreId",
                    "duration", "start", "finish", "track", "trackCount", "disc",
                    "discCount", "playCount", "ext"];
var PlaylistIndices = ["id", "name", "parentId", "isLibrary"];
var PlaylistTracksIndices = ["id", "tracks"];

var Genre = function(row) {
  for (idx in GenreIndices) {
    this[GenreIndices[idx]] = row[idx];
  }
}

var Artist = function(row) {
  for (idx in ArtistIndices) {
    this[ArtistIndices[idx]] = row[idx];
  }

  fixSortName(this);
}

var Album = function(row) {
  for (idx in AlbumIndices) {
    this[AlbumIndices[idx]] = row[idx];
  }

  fixSortName(this);
}

var Track = function(row, artists, albums, genres) {
  for (idx in TrackIndices) {
    this[TrackIndices[idx]] = row[idx]
  }

  this.duration = parseFloat(this.duration);
  this.time = secondsToTime(this.duration);
  this.artist = artists[this.artistId].name;
  this.sortArtist = artists[this.artistId].sortName;
  this.album = albums[this.albumId].name;
  this.sortAlbum = albums[this.albumId].sortName;
  this.genre = genres[this.genreId].name;

  fixSortName(this);
}

var Playlist = function(row) {
  for (idx in PlaylistIndices) {
    this[PlaylistIndices[idx]] = row[idx]
  }

  this.children = [];
}

var PlaylistTracks = function(row) {
  for (idx in PlaylistIndices) {
    this[PlaylistTracksIndices[idx]] = row[idx]
  }
}
