app_dir = File.expand_path(File.dirname(__FILE__))
working_directory app_dir

worker_processes 8
timeout 600

listen File.join(app_dir, 'tmp/sockets/unicorn.sock'), :backlog => 64
pid    File.join(app_dir, 'tmp/pids/unicorn.pid')

stderr_path File.join(app_dir, 'log/unicorn.stderr.log')
stdout_path File.join(app_dir, 'log/unicorn.stdout.log')

after_fork do |server, worker|
  require_relative 'shared/config.rb'
  Config.set_use_persistent_db(true)
end
