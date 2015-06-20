var Playlist = function() {
  this.playlist = [];
  this.playlistIndex = 0;
}

Playlist.prototype.shufflePlaylist = function() {
  // from http://stackoverflow.com/questions/6274339/how-can-i-shuffle-an-array-in-javascript
  for (var j, x, i = this.playlist.length; i; j = Math.floor(Math.random() * i),
    x = this.playlist[--i], this.playlist[i] = this.playlist[j], this.playlist[j] = x);
}

Playlist.prototype.rebuild = function(shuffle, nowPlayingId, api) {
  if (api) this.api = api
  this.playlist = this.api.rows({search: "applied"}).data().map(function (x) { return x.id });

  if (nowPlayingId >= 0) {
    // if the current song isn't in the results, then this will return -1,
    // which means the next song to be played will be index 0 which is what we want
    this.playlistIndex = this.playlist.indexOf(nowPlayingId);
  } else {
    this.playlistIndex = 0;
  }

  if (shuffle) {
    // pull out the currently playing track
    if (this.playlistIndex > 0) { this.playlist.splice(this.playlistIndex, 1); }
    this.shufflePlaylist();

    // and add it back at the beginning
    if (this.playlistIndex > 0) { this.playlist.unshift(nowPlayingId); }
    this.playlistIndex = 0;
  }
}

Playlist.prototype.getCurrentTrackId = function() {
  return this.playlist[this.playlistIndex];
}

Playlist.prototype.moveBack = function() {
  this.playlistIndex--;
  if (this.playlistIndex < 0) {
    this.playlistIndex = this.playlist.length - 1;
  }
}

Playlist.prototype.getNextIndex = function() {
  if (this.playlistIndex+1 >= this.playlist.length) return 0;
  return this.playlistIndex + 1;
}

Playlist.prototype.moveForward = function() {
  this.playlistIndex = this.getNextIndex();
}

Playlist.prototype.getNextTrackId = function() {
  return this.playlist[this.getNextIndex()];
}
