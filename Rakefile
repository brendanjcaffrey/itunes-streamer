require 'rubygems'
require 'require_all'
require 'sinatra'
require_relative 'shared/config.rb'

task :export do
  Config.set_env('local')
  require_all 'export'

  database = Export::Database.new(Config['database_username'], Config['database_name'])
  library = Export::Library.new
  progress = Export::Progress.new
  Export::Driver.new(database, library, progress).export_itunes_library!
end

task :update_library do
  Config.set_env('local')
  require_all 'export'

  database = Export::Database.new(Config['database_username'], Config['database_name'])
  library = Export::Library.new
  progress = Export::Progress.new
  Export::Driver.new(database, library, progress).update_library!
end

task :local do
  Config.set_env('local')
  require_relative 'serve'

  Serve.run!
end

task :remote do
  Config.set_env('remote')
  require_relative 'serve'

  Serve.run!
end
