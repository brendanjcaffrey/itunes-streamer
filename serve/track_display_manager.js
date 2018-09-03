var TrackDisplayManager = function(tracksHash, colDescriptions, rowsPerPage, genres) {
  this.tracksHash = tracksHash;
  this.rowsPerPage = rowsPerPage;

  this.colDescriptions = [];
  for (var idx in colDescriptions) {
    var col = colDescriptions[idx];
    if (!('type' in col)) { col.type = "string"; }
    if (!('typeToShow' in col)) { col.typeToShow = true; }
    this.colDescriptions.push(col);
  }

  this.selectedTrackId = "";
  this.nowPlayingTrackId = "";

  var genreNames = []
  for (genreId in genres) { genreNames.push(genres[genreId].name); }
  genreNames.sort();
  genreNames.forEach((name, index) => {
    $("#track-genre").append("<option value=\"" + name + "\">" + name + "</option>");
  });
}

TrackDisplayManager.prototype.setCallbacks = function(tracksChangedCallback, numPagesChangedCallback, changedToPageCallback, sortForTypeToShowListCallack, playTrackCallback) {
  this.tracksChangedCallback = tracksChangedCallback;
  this.numPagesChangedCallback = numPagesChangedCallback;
  this.changedToPageCallback = changedToPageCallback;
  this.playTrackCallback = playTrackCallback;
  this.sortForTypeToShowListCallack = sortForTypeToShowListCallack;
}

TrackDisplayManager.prototype.tracksChanged = function(trackIds, showNowPlayingIfPossible) {
  this.page = 0;
  this.trackIds = trackIds.slice(0); // make a copy of the array

  // below also resets view back to the first page
  this.numPagesChangedCallback(Math.ceil(this.trackIds.length / this.rowsPerPage));

  // TODO this could (probably) be done when first key is pressed - should be finished by the time the timeout fires?
  this.typeToShowList = this.sortForTypeToShowListCallack(this.trackIds);

  if (this.nowPlayingTrackId && showNowPlayingIfPossible) {
    var nowPlayingIdx = this.trackIds.indexOf(this.nowPlayingTrackId);
    if (nowPlayingIdx != -1) {
      var pageIdx = this.getPageOfIdx(nowPlayingIdx);
      this.pageChanged(pageIdx);
      this.changedToPageCallback(pageIdx);
      return; // pageChanged calls sendCurrentTracks
    }
  }

  this.sendCurrentTracks();
}

TrackDisplayManager.prototype.sendCurrentTracks = function() {
  var trackIdsSlice = this.trackIds.slice(this.page * this.rowsPerPage, (this.page + 1) * this.rowsPerPage);
  var tracks = trackIdsSlice.map(trackId => this.tracksHash[trackId]);
  this.tracksChangedCallback(tracks, trackIdsSlice.indexOf(this.selectedTrackId), trackIdsSlice.indexOf(this.nowPlayingTrackId));
}

TrackDisplayManager.prototype.getPageOfIdx = function(idx) {
  return Math.floor(idx / this.rowsPerPage);
}

TrackDisplayManager.prototype.getDisplayedTrackId = function(offset) {
  return this.trackIds[this.page * this.rowsPerPage + offset];
}

TrackDisplayManager.prototype.pageChanged = function(page) {
  this.page = page;
  this.sendCurrentTracks();
}

TrackDisplayManager.prototype.typeToShow = function(text) {
  if (this.typeToShowList.length == 0) { return; }

  var binarySearchNameFirstOccurrence = (searchStr) => {
    var binarySearchStep = (lower, upper) => {
      if (lower > upper) { return lower; }

      var middle = Math.floor((lower + upper) / 2.0);
      var middleText = this.typeToShowList[middle][0].substr(0, searchStr.length);
      // go backwards, even if equal, to get first occurrence
      if (middleText >= searchStr) { upper = middle-1; }
      else { lower = middle+1; }

      return binarySearchStep(lower, upper);
    };

    var idx = binarySearchStep(0, this.typeToShowList.length-1);
    if (idx == null) { return null; }
    return this.typeToShowList[idx][1];
  };

  trackIdx = binarySearchNameFirstOccurrence(text);

  if (trackIdx != null) {
    this.selectedTrackId = this.trackIds[trackIdx];
    var newPage = this.getPageOfIdx(trackIdx);
    this.pageChanged(newPage);
    this.changedToPageCallback(newPage);
  }
}

TrackDisplayManager.prototype.nowPlayingIdChanged = function(trackId, showTrack) {
  this.nowPlayingTrackId = trackId;

  if (showTrack) {
    var trackIdx = this.trackIds.indexOf(trackId);
    if (trackIdx != -1) {
      var pageIdx = this.getPageOfIdx(trackIdx);
      this.pageChanged(pageIdx);
      this.changedToPageCallback(pageIdx);
      return;
    }
  }

  this.sendCurrentTracks();
}

TrackDisplayManager.prototype.trackClicked = function(idx) {
  this.selectedTrackId = this.getDisplayedTrackId(idx);
}

TrackDisplayManager.prototype.playTrack = function(idx) {
  var trackId = this.getDisplayedTrackId(idx);
  this.playTrackCallback(trackId);
}

TrackDisplayManager.prototype.downloadTrack = function(idx) {
  var trackId = this.getDisplayedTrackId(idx);
  window.location = "/download/" + trackId;
}

TrackDisplayManager.prototype.trackInfo = function(idx) {
  var trackId = this.getDisplayedTrackId(idx);
  var track = this.tracksHash[trackId];

  $("#track-name").val(track.name);
  $("#track-artist").val(track.artist);
  $("#track-album").val(track.album);
  $("#track-album-artist").val(track.albumArtist);
  $("#track-genre").val(track.genre);
  $("#track-year").val(track.year);

  $("#track-info-modal").modal();
}
