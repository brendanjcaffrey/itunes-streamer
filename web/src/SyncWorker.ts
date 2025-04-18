import axios, { isAxiosError } from "axios";
import {
  IsStartSyncMessage,
  IsTypedMessage,
  TypedMessage,
  ErrorMessage,
  LibraryMetadataMessage,
  SYNC_SUCCEEDED_TYPE,
  ERROR_TYPE,
  LIBRARY_METADATA_TYPE,
} from "./WorkerTypes";
import library, { Track, Playlist } from "./Library";
import {
  VersionResponse,
  LibraryResponse,
  Library,
  Name,
  SortName,
} from "./generated/messages";

class SyncManager {
  private syncInProgress: boolean = false;

  public startSync(
    authToken: string,
    updateTimeNs: number,
    browserOnline: boolean
  ) {
    // this happens because react runs all effects twice in development mode
    if (this.syncInProgress) {
      return;
    }
    this.syncInProgress = true;

    // check if we have the most update to date version of the library, if so don't sync
    if (updateTimeNs > 0) {
      axios
        .get("/api/version", {
          responseType: "arraybuffer",
          headers: { Authorization: `Bearer ${authToken}` },
        })
        .then((response) => {
          const { data } = response;
          const msg = VersionResponse.deserialize(data);
          if (msg.response === "error") {
            throw new Error(msg.error);
          }

          if (msg.updateTimeNs === updateTimeNs) {
            postMessage({ type: SYNC_SUCCEEDED_TYPE } as TypedMessage);
            this.syncInProgress = false;
          } else {
            this.syncLibrary(authToken);
          }
        })
        .catch((error) => {
          console.error(error);
          if (
            isAxiosError(error) &&
            (!browserOnline || error.code === "ERR_NETWORK")
          ) {
            postMessage({ type: SYNC_SUCCEEDED_TYPE } as TypedMessage);
          } else {
            postMessage({
              type: ERROR_TYPE,
              error: error.message,
            } as ErrorMessage);
          }
          this.syncInProgress = false;
        });
    } else {
      this.syncLibrary(authToken);
    }
  }

  private syncLibrary(authToken: string) {
    axios
      .get("/api/library", {
        responseType: "arraybuffer",
        headers: { Authorization: `Bearer ${authToken}` },
      })
      .then((response) => {
        const { data } = response;
        const msg = LibraryResponse.deserialize(data);
        if (msg.response === "error") {
          throw new Error(msg.error);
        }

        this.processSyncResponse(msg.library)
          .then(() => {
            postMessage({ type: SYNC_SUCCEEDED_TYPE } as TypedMessage);
          })
          .catch((error) => {
            console.error(error);
            postMessage({
              type: ERROR_TYPE,
              error: error.message,
            } as ErrorMessage);
          });
      })
      .catch((error) => {
        console.error(error);
        postMessage({ type: ERROR_TYPE, error: error.message } as ErrorMessage);
      })
      .finally(() => {
        this.syncInProgress = false;
      });
  }

  private static getName(value: Name | SortName | undefined): string {
    return value?.name ?? "";
  }

  private static getSortName(value: SortName | undefined): string {
    if (!value) {
      return "";
    }
    return value.sortName || value.name;
  }

  private async processSyncResponse(msg: Library) {
    library().clear();

    postMessage({
      type: LIBRARY_METADATA_TYPE,
      trackUserChanges: msg.trackUserChanges,
      totalFileSize: msg.totalFileSize,
      updateTimeNs: msg.updateTimeNs,
    } as LibraryMetadataMessage);

    for (const track of msg.tracks) {
      const artist = msg.artists.get(track.artistId);
      const albumArtist = msg.artists.get(track.albumArtistId);
      const album = msg.albums.get(track.albumId);
      const genre = msg.genres.get(track.genreId);
      const dto: Track = {
        id: track.id,
        name: track.name,
        sortName: track.sortName,
        artistName: SyncManager.getName(artist),
        artistSortName: SyncManager.getSortName(artist),
        albumArtistName: SyncManager.getName(albumArtist),
        albumArtistSortName: SyncManager.getSortName(albumArtist),
        albumName: SyncManager.getName(album),
        albumSortName: SyncManager.getSortName(album),
        genre: SyncManager.getName(genre),
        year: track.year,
        duration: track.duration,
        start: track.start,
        finish: track.finish,
        trackNumber: track.trackNumber,
        discNumber: track.discNumber,
        playCount: track.playCount,
        rating: track.rating,
        ext: track.ext,
        fileMd5: track.fileMd5,
        artworks: track.artworks,
      };
      await library().putTrack(dto);
    }

    for (const playlist of msg.playlists) {
      const dto: Playlist = {
        id: playlist.id,
        name: playlist.name,
        parentId: playlist.parentId,
        isLibrary: playlist.isLibrary,
        trackIds: playlist.trackIds,
      };
      await library().putPlaylist(dto);
    }
  }
}

const syncManager = new SyncManager();

onmessage = (m: MessageEvent) => {
  const { data } = m;
  if (!IsTypedMessage(data)) {
    return;
  }

  if (IsStartSyncMessage(data)) {
    syncManager.startSync(
      data.authToken,
      data.updateTimeNs,
      data.browserOnline
    );
  }
};
