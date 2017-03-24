const log = require('debug')('app:main');
const spawn = require('child_process').spawn;

// const argv = require('minimist')(process.argv.slice(2));
// console.dir(argv);

const consts = {
  ANALYZE: 'ANALYZE',
  READY: 'READY'
}

async function createAnalyzer () {
  const cp = await createCNNProcess();
  return analyzeTextAddCP(cp);
}

async function createCNNProcess() {
  return new Promise((resolve, reject) => {
    log('Spawning python process');
    const cp = spawn('python', ['eval.py', 'someOptions'], {
      cwd: './cnn-text-classification-tf'
    });

    cp.stdin.setEncoding('utf-8');

    cp.on('exit', () => {
      log('Python process died');
    });

    cp.promiseSolvers = [];

    // register for incoming data
    cp.stdout.on('data', chunk => {
      let str = chunk.toString('utf-8');
      if(str.indexOf(consts.READY) === 0) {
        log('READY received');
        resolve(cp);
      } else if(str.indexOf(consts.ANALYZE) === 0) {
        log('ANALYZE received', str);
        str = str.split(consts.ANALYZE)[1].split('\n')[0];
        const data = JSON.parse(str);
        cp.promiseSolvers[data.id](data);
      } else {
        log(str);
      }
    });

    cp.stderr.on('data', chunk => log(chunk.toString('utf-8')));
  });
}

/**
 * async function to analyze text
 * @param text - text to analyze
 * @return - promise
*/
const analyzeTextAddCP = function (cp) {
  let i = 0;

  return async function analyzeText (text) {
    const promise = new Promise((resolve, reject) => {
      cp.promiseSolvers.push(resolve);
    });

    cp.stdin.write(JSON.stringify({ id: i, job: consts.ANALYZE, text }) + '\n');

    i++;
    return promise;
  }
};

module.exports = createAnalyzer;
