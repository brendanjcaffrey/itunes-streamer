var PersistentSettings = function() {
  cookies = Cookies.get();
  // both default to false
  this.shuffle = (Cookies.get("shuffle") == "1");
  this.repeat  = (Cookies.get("repeat") == "1");
}

PersistentSettings.prototype.persist = function() {
  Cookies.set("shuffle", this.shuffle ? "1" : "0", { expires: 60 });
  Cookies.set("repeat", this.repeat ? "1" : "0", { expires: 60 });
}

PersistentSettings.prototype.getShuffle = function() { return this.shuffle; }
PersistentSettings.prototype.setShuffle = function(shuffle) {
  this.shuffle = shuffle;
  this.persist();
}

PersistentSettings.prototype.getRepeat = function() { return this.repeat; }
PersistentSettings.prototype.setRepeat = function(repeat) {
  this.repeat = repeat;
  this.persist();
}


var Streamer = function(data) {
  var toHash = function(hash, object, index, array) {
    hash[object.id] = object;
    return hash;
  }

  var artists = data["artists"].map(function (row) { return new Artist(row); }).reduce(toHash, {});
  var albums = data["albums"].map(function (row) { return new Album(row); }).reduce(toHash, {});
  var genres = data["genres"].map(function (row) { return new Genre(row); }).reduce(toHash, {});
  var playlists = data["playlists"].map(function (row) { return new Playlist(row); });

  this.playlistsHash = playlists.reduce(toHash, {});
  this.playlistTree = ResolvePlaylistTree(playlists);
  this.buildPlaylistMenu();

  var sortSearchName = function(i1, i2) {
    if (i1.searchName == i2.searchName) { return 0; }
    else if (i1.searchName > i2.searchName) { return 1; }
    else { return -1; }
  }
  this.tracksArr = data["tracks"].map(function (row) { return new Track(row, artists, albums, genres); }).sort(sortSearchName);
  this.tracksHash = this.tracksArr.reduce(toHash, {});

  this.settings = new PersistentSettings();
  this.audio = new Audio(this);
  this.playlistManager = new PlaylistManager(this.audio, this.settings, this.tracksHash);

  this.stopped = true;
  this.playing = false;

  this.skipRebuild = false;
  this.nowPlayingRow = this.selectedRow = null;

  this.letterPressString = "";
  this.letterPressTimeoutID = null;
}

Streamer.prototype.buildPlaylistMenu = function() {
  var self = this;
  var ulClasses = 'nav nav-pills nav-stacked';

  var buildPlaylistMenuStep = function(children, parentElement) {
    children.forEach(function(playlist, index, arr) {
      var isFolder = playlist.children.length > 0;
      var arrow = isFolder ? "ion-arrow-right-b" : "ion-arrow-right-b spacer";
      var icon = isFolder ? "ion-ios-folder-outline" : "ion-ios-list-outline";
      var isActive = false;
      if (playlist.isLibrary) { icon = "ion-ios-musical-notes"; isActive = true; }
      parentElement.append('<li data-playlist-id="' + playlist.id + '" data-is-folder="' + (isFolder ? '1' : '0') + '"' +
          (isActive ? ' class="active"' : '') + '><a href="#"><i class="arrow icon ' + arrow + '" /><i class="icon marker ' +
          icon + '" />' + playlist.name + "</a></li>");

      var currentLi = parentElement.children("li").last();
      currentLi.on("click", function(e) {
        var li = $(e.delegateTarget);
        var playlistId = parseInt(li.attr("data-playlist-id"));
        var target = $(e.target);
        if (target.hasClass("arrow") && li.attr("data-is-folder") == "1") {
          self.toggleFolder(playlistId, li, target);
        } else {
          self.showPlaylist(playlistId, li);
        }
      });

      if (isFolder) {
        parentElement.append('<li class="hidden" id="childrenof' + playlist.id + '"><ul class="' + ulClasses + '"></ul></li>');
        buildPlaylistMenuStep(playlist.children, parentElement.children("li").last().children("ul"));
      }
    });
  }

  $("#playlists").append('<ul class="' + ulClasses + '"></ul>');
  buildPlaylistMenuStep(this.playlistTree, $("#playlists").children("ul"));
}

Streamer.prototype.toggleFolder = function(id, li, arrow) {
  var closedClass = "ion-arrow-right-b";
  var openClass = "ion-arrow-down-b";

  var isClosed = arrow.hasClass(closedClass);
  if (isClosed) {
    arrow.removeClass(closedClass).addClass(openClass);
    $("#childrenof" + id).removeClass("hidden");
  } else {
    arrow.removeClass(openClass).addClass(closedClass);
    $("#childrenof" + id).addClass("hidden");
  }
}

Streamer.prototype.showPlaylist = function(id, li) {
  $("#playlists li.active").removeClass("active");
  li.addClass("active");
}

Streamer.prototype.highlightRow = function(row) {
  if (!$(row).hasClass("selected")) {
    if (this.selectedRow) { $(this.selectedRow).removeClass("selected"); }
    $(row).addClass("selected");
  }

  this.selectedRow = row;
}

Streamer.prototype.manualRowPlay = function(row) {
  this.highlightRow(row);
  this.setNowPlaying(row);
  // we pass in false for stopped here to get the playlist to use the song we just set as playing
  this.playlistManager.rebuild(false, this.api.row(row).data().id);
  this.play();
}

Streamer.prototype.hideMenu = function() {
  $("#contextMenu").remove();
}

Streamer.prototype.showMenu = function(row, e) {
  this.highlightRow(row);
  var menu = $('<ul id="contextMenu">');
  var self = this;

  var download = $("<li>Download</li>")
      .hover(function() { $(this).addClass("hover"); },
             function() { $(this).removeClass("hover"); })
      .mousedown(function() {
        var track = self.api.row(row).data();
        window.location = "/download/" + String(track.id);
      });
  menu.append(download);

  var play = $("<li>Play</li>")
      .hover(function() { $(this).addClass("hover"); },
             function() { $(this).removeClass("hover"); })
      .mousedown(function() { self.manualRowPlay(row); });
  menu.append(play);

  var x = e.pageX - 2;
  var y = e.pageY - 17;
  menu.css({ "position": "absolute", top: y, left: x });

  $("body").append(menu);
  $("body").one("click", this.hideMenu);
  $(document).one("mousedown", this.hideMenu);
}

Streamer.prototype.setNowPlaying = function(row) {
  this.clearNowPlaying();

  $(row).addClass("now-playing");
  $(row).find("td:first-child").prepend('<i class="icon ion-ios-volume-high"></i>');
  this.nowPlayingRow = row;
}

Streamer.prototype.clearNowPlaying = function() {
  if (this.nowPlayingRow) {
    $(this.nowPlayingRow).find("td i").remove();
    $(this.nowPlayingRow).removeClass("now-playing");
    this.nowPlayingRow = null;
  }

  this.audio.pause();
}

Streamer.prototype.findRowForTrackId = function(trackId) {
  var self = this;
  // rows() returns an array with one element, another array of indices
  var rowIndices = this.api.rows({"search": "applied"})[0];
  for (var i = 0; i < rowIndices.length; ++i) {
    var thisRow = self.api.row(rowIndices[i], {"search": "applied"});
    if (thisRow.data().id == trackId) { return thisRow.node(); }
  }

  return null;
}

Streamer.prototype.showRow = function(row) {
  this.skipRebuild = true;
  this.api.row(row).show().draw(false);
  this.skipRebuild = false;
}

Streamer.prototype.play = function() {
  var row = this.findRowForTrackId(this.playlistManager.getCurrentTrackId());
  if (row != null) { // could be a track hidden by searching
    this.setNowPlaying(row);
    this.showRow(row);
  }

  this.stopped = false;
  this.playing = true;
  $("#playpause").removeClass("ion-ios-play").addClass("ion-ios-pause");
  this.audio.play();
}

Streamer.prototype.stop = function() {
  this.audio.pause();
  this.clearNowPlaying();
}

Streamer.prototype.pause = function() {
  this.playing = false;
  $("#playpause").removeClass("ion-ios-pause").addClass("ion-ios-play");
  this.audio.pause();
}

Streamer.prototype.prev = function() {
  if (this.settings.getRepeat() && this.audio.tryRewind()) { return; }

  this.playlistManager.moveBack();
  if (this.nowPlayingRow) { this.stop(); this.play(); }
}

Streamer.prototype.next = function() {
  if (this.settings.getRepeat() && this.audio.tryRewind()) { return; }

  this.playlistManager.moveForward();
  if (this.nowPlayingRow) { this.stop(); this.play(); }
}

Streamer.prototype.playPause = function() {
  if (this.playing) { this.pause(); }
  else              { this.play(); }
}

Streamer.prototype.toggleShuffle = function() {
  if (this.settings.getShuffle()) {
    this.settings.setShuffle(false);
    $("#shuffle").addClass("disabled");
  } else {
    this.settings.setShuffle(true);
    $("#shuffle").removeClass("disabled");
  }

  this.playlistManager.rebuild(this.stopped, this.audio.getNowPlayingTrackId());
}

Streamer.prototype.toggleRepeat = function() {
  if (this.settings.getRepeat()) {
    this.settings.setRepeat(false);
    $("#repeat").addClass("disabled");
  } else {
    this.settings.setRepeat(true);
    $("#repeat").removeClass("disabled");
  }
}

Streamer.prototype.volumeUpdated = function(value) {
  this.audio.updateAllVolumes(value);
}

Streamer.prototype.volumeUp = function() {
  value = this.audio.currentVolume + 10;
  if (value > 100) { value = 100; }

  this.volumeUpdated(value);
  this.volume.slider("setValue", value);
}

Streamer.prototype.volumeDown = function() {
  value = this.audio.currentVolume - 10;
  if (value < 0) { value = 0; }

  this.volumeUpdated(value);
  this.volume.slider("setValue", value);
}

Streamer.prototype.onLetterPress = function(letter) {
  var self = this;
  self.letterPressString += letter;

  if (self.letterPressTimeoutID != null) {
    window.clearTimeout(self.letterPressTimeoutID);
    self.letterPressTimeoutID = null;
  }

  self.letterPressTimeoutID = window.setTimeout(function() {
    track = self.tracksArr.find(function(track) { return track.searchName.substr(0, self.letterPressString.length) >= self.letterPressString; });
    var row = self.findRowForTrackId(track.id);

    // could be filtered away - ignoring this isn't great, but searching only the filtered tracks would be difficult
    if (row != null) {
      self.highlightRow(row);
      self.showRow(row);
    }

    self.letterPressString = "";
    self.letterPressTimeoutID = null;
  }, 750);
}

Streamer.prototype.start = function() {
  var self = this;

  if (!self.settings.getShuffle()) { $("#shuffle").addClass("disabled"); }
  if (!self.settings.getRepeat()) { $("#repeat").addClass("disabled"); }

  $("#control-row, #content-row").removeClass("hidden");
  $("#loading").remove();

  $("#playpause").click(function() { self.playPause() });
  $("#prev").click(function() { self.prev() });
  $("#next").click(function() { self.next() });
  $("#shuffle").click(function() { self.toggleShuffle() });
  $("#repeat").click(function() { self.toggleRepeat() });

  $("#playpause, #prev, #next").mousedown(function() { $(this).addClass("disabled"); });
  $("#playpause, #prev, #next").mouseup(function() { $(this).removeClass("disabled"); });
  $("#playpause, #prev, #next").mouseleave(function() { $(this).removeClass("disabled"); });

  // create slider, initialize volume to 50%
  this.volume = $("#volume").slider({value: 50}).
    on("slide", function(slider) { self.volumeUpdated(slider.value); });
  self.volumeUpdated(50);

  var table = $("#tracks").DataTable({
    "drawCallback": function (settings) {
      // when a track starts playing, we redraw the table to show its page
      // this is to prevent rebuilding the playlist when that happens
      if (self.skipRebuild) { return; }

      // this drawCallback is called immediately after defining the table,
      // so there's no way to gracefully set the api variable except here
      self.api = this.api();
      self.playlistManager.rebuild(self.stopped, self.audio.getNowPlayingTrackId(), self.api);
    },
    "lengthChange": false,
    "columns": [
      { "data": { "_": "name", "sort": "sortName" } },
      { "data": { "_": "time", "sort": "duration" }, "type": "numeric" },
      { "data": { "_": "artist", "sort": "sortArtist" } },
      { "data": { "_": "album", "sort": "sortAlbum" } },
      { "data": "genre" },
      { "data": "playCount" },
    ],
    "data": self.tracksArr
  });

  table.page.len(45);
  table.draw();

  $("#tracks tbody").on("dblclick", "tr", function() { self.manualRowPlay(this); })
  $("#tracks tbody").on("click", "tr", function () { self.highlightRow(this); });
  $("#tracks tbody").on("contextmenu", "tr", function (e) {
    self.showMenu(this, e); return false;
  });
}

var streamer;
$(window).load(function() {
  $.getJSON("/data.json", function(data) {
    streamer = new Streamer(data);
    streamer.start();
    $("#tracks_filter").detach().appendTo($("#filter"));

    $(document).bind("keydown", "right", function(e) {
      streamer.next(); return false;
    });

    $(document).bind("keydown", "left", function(e) {
      streamer.prev(); return false;
    });

    $(document).bind("keydown", "space", function(e) {
      if (streamer.letterPressTimeoutID != null) { streamer.onLetterPress(" "); }
      else { streamer.playPause(); }
      return false;
    });

    $(document).bind("keydown", "ctrl+up", function(e) {
      streamer.volumeUp(); return false;
    });

    $(document).bind("keydown", "ctrl+down", function(e) {
      streamer.volumeDown(); return false;
    });

    // this is how the chrome extension communicates with the web app
    window.addEventListener("message", function(event) {
      if (event.data.source != "itunes-streamer") { return; }

      switch (event.data.type) {
        case "play-pause":  streamer.playPause(); break;
        case "next":        streamer.next(); break;
        case "prev":        streamer.prev(); break;
        case "volume-up":   streamer.volumeUp(); break;
        case "volume-down": streamer.volumeDown(); break;
      }
    }, false);

    var alphabet = "abcdefghijklmnopqrstuvwxyz".split("");
    $.each(alphabet, function(i, e) {
      $(document).bind("keydown", alphabet[i], function(e) {
        streamer.onLetterPress(alphabet[i]);
      });
    });
  });
});
