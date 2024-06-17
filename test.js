/**
 * @fileoverview This script uses worker threads to send multiple HTTP requests concurrently.
 */

const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

const NUM_REQUESTS = 1000;
const NUM_WORKERS = 10; // 각 워커가 처리할 요청 수

if (isMainThread) {
  // 메인 스레드
  /**
   * Creates worker threads and handles their promises.
   * @returns {Promise<void>}
   */
  const promises = [];

  for (let i = 0; i < NUM_WORKERS; i++) {
    promises.push(
      new Promise((resolve, reject) => {
        const worker = new Worker(__filename, {
          workerData: {
            start: i * (NUM_REQUESTS / NUM_WORKERS),
            end: (i + 1) * (NUM_REQUESTS / NUM_WORKERS),
          },
        });

        worker.on('message', resolve);
        worker.on('error', reject);
        worker.on('exit', (code) => {
          if (code !== 0) {
            reject(new Error(`Worker stopped with exit code ${code}`));
          }
        });
      })
    );
  }

  Promise.all(promises)
    .then((results) => {
      console.log('All requests completed successfully');
    })
    .catch((error) => {
      console.error('Error in worker threads:', error);
    });
} else {
  // 워커 스레드
  const { start, end } = workerData;

  /**
   * Sends HTTP requests in the worker thread.
   * @async
   * @returns {Promise<void>}
   */
  const sendRequests = async () => {
    for (let i = start; i < end; i++) {
      const nickname = uuidv4();
      try {
        const response = await axios.post('http://localhost:3000/setName', {
          name: nickname,
        });
        console.log(`Request ${i} response:`, response.data);
      } catch (error) {
        console.error(`Request ${i} error:`, error.response ? error.response.data : error.message);
      }
    }
    parentPort.postMessage(`Worker completed requests from ${start} to ${end}`);
  };

  sendRequests();
}
