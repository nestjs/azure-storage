process.stdin.resume();

interface ProcessOptions {
  cleanup: boolean;
  exit: boolean;
}

export function registerOnExit() {
  function exitHandler(options: ProcessOptions, exitCode: number) {
    if (options.cleanup) {
    }
    if (exitCode || exitCode === 0) {
    }
    if (options.exit) {
      process.exit();
    }
  }

  process.on('exit', exitHandler.bind(null, { cleanup: true }));
  process.on('SIGINT', exitHandler.bind(null, { exit: true }));
  process.on('SIGUSR1', exitHandler.bind(null, { exit: true }));
  process.on('SIGUSR2', exitHandler.bind(null, { exit: true }));
  process.on('uncaughtException', exitHandler.bind(null, { exit: true }));
}
