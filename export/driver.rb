require 'net/http'
require 'json'

module Export
  class Driver
    def initialize(database, library, progress)
      @database = database
      @library = library
      @progress = progress
    end

    def update_library!
      if Config.local('update_library')
        play_updates(@database.get_plays)
        rating_updates(@database.get_ratings)
        name_updates(@database.get_name_updates)
        artist_updates(@database.get_artist_updates)
        album_updates(@database.get_album_updates)
        album_artist_updates(@database.get_album_artist_updates)
        genre_updates(@database.get_genre_updates)
        year_updates(@database.get_year_updates)
        start_updates(@database.get_start_updates)
        finish_updates(@database.get_finish_updates)
      end

      if Config.remote('update_library')
        json = JSON.parse(Net::HTTP.get(URI(Config.remote('base_url') + '/updates.json')))
        play_updates(json['plays'])
        rating_updates(json['ratings'])
        name_updates(json['names'])
        artist_updates(json['artists'])
        album_updates(json['albums'])
        album_artist_updates(json['album_artists'])
        genre_updates(json['genres'])
        year_updates(json['years'])
        start_updates(json['starts'])
        finish_updates(json['finishes'])
      end
    end

    def export_itunes_library!
      @database.clean_and_rebuild
      @skipped_tracks = {}
      @needed_folders = {}

      export_tracks ; export_playlists ; export_folders
      @database.set_export_finished
    end

    private

    def play_updates(plays)
      puts "\n=== Plays ==="
      plays.each do |persistent_id|
        puts @database.get_track_and_artist_name(persistent_id).join(' - ')
        @library.add_play(persistent_id)
      end
    end

    def rating_updates(ratings)
      puts "\n=== Ratings ==="
      ratings.each do |row|
        puts @database.get_track_and_artist_name(row.first).join(' - ')
        @library.update_rating(row.first, row.last)
      end
    end

    def name_updates(names)
      puts "\n=== Names ==="
      names.each do |row|
        puts @database.get_track_and_artist_name(row.first).join(' - ')
        @library.update_name(row.first, row.last)
      end
    end

    def artist_updates(artists)
      puts "\n=== Artists ==="
      artists.each do |row|
        puts @database.get_track_and_artist_name(row.first).join(' - ')
        @library.update_artist(row.first, row.last)
      end
    end

    def album_updates(albums)
      puts "\n=== Albums ==="
      albums.each do |row|
        puts @database.get_track_and_artist_name(row.first).join(' - ')
        @library.update_album(row.first, row.last)
      end
    end

    def album_artist_updates(album_artists)
      puts "\n=== Album Artists ==="
      album_artists.each do |row|
        puts @database.get_track_and_artist_name(row.first).join(' - ')
        @library.update_album_artist(row.first, row.last)
      end
    end

    def genre_updates(genres)
      puts "\n=== Genres ==="
      genres.each do |row|
        puts @database.get_track_and_artist_name(row.first).join(' - ')
        @library.update_genre(row.first, row.last)
      end
    end

    def year_updates(years)
      puts "\n=== Years ==="
      years.each do |row|
        puts @database.get_track_and_artist_name(row.first).join(' - ')
        @library.update_year(row.first, row.last)
      end
    end

    def start_updates(starts)
      puts "\n=== Starts ==="
      starts.each do |row|
        puts @database.get_track_and_artist_name(row.first).join(' - ')
        @library.update_start(row.first, row.last)
      end
    end

    def finish_updates(finishes)
      puts "\n=== Finishes ==="
      finishes.each do |row|
        puts @database.get_track_and_artist_name(row.first).join(' - ')
        @library.update_finish(row.first, row.last)
      end
    end

    def export_tracks
      track_count = @library.total_track_count
      @progress.start('Exporting tracks...', track_count)

      track_count.times do |track_index|
        @progress.increment!
        track = @library.track_info(track_index)

        if track.valid_extension?
          @database.create_track(track)
        else
          puts "Skipping #{track.file} due to invalid extension"
          @skipped_tracks[track.id] = true
        end
      end
    end

    def export_playlists
      playlist_count = @library.total_playlist_count
      @progress.start('Exporting playlists...', playlist_count)

      playlist_count.times do |playlist_index|
        @progress.increment!
        playlist = @library.playlist_info(playlist_index)
        next if playlist.skip?

        playlist.tracks.reject! { |track_id| @skipped_tracks.has_key?(track_id) }

        @database.create_playlist(playlist)
        @needed_folders[playlist.parent_id] = true if playlist.parent_id != -1
      end
    end

    def export_folders
      folder_count = @library.total_folder_count
      @progress.start('Exporting folders...', folder_count)

      folder_count.times do |folder_index|
        @progress.increment!
        folder = @library.folder_info(folder_index)

        if @needed_folders.has_key?(folder.id)
          @database.create_playlist(folder)
        else
          puts "Skipping folder #{folder.name} because it has no children"
        end
      end
    end
  end
end
