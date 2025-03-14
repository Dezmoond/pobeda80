const video = document.getElementById('video');
const statusDiv = document.querySelector('.status');
const audioMap = {
    'video1': 'audio/video1.mp3',
    'video2': 'audio/video2.mp3',
    'video3': 'audio/video3.mp3'
};
let currentAudio = null;

// Функция загрузки модели
async function loadModel() {
    return await tf.loadLayersModel('./model/model.json');
}

// Функция захвата изображения с камеры
async function setupCamera() {
    const stream = await navigator.mediaDevices.getUserMedia({
        video: true
    });
    video.srcObject = stream;

    return new Promise(resolve => {
        video.onloadedmetadata = () => resolve(video);
    });
}

// Воспроизведение звука
function playAudio(audioSrc) {
    if (currentAudio) {
        currentAudio.pause(); // Остановить предыдущее аудио
    }
    currentAudio = new Audio(audioSrc);
    currentAudio.play();
}

// Основной процесс классификации
async function run() {
    const model = await loadModel();
    await setupCamera();

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    setInterval(() => {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        const input = tf.browser.fromPixels(canvas).resizeNearestNeighbor([224, 224]).toFloat().expandDims();
        const prediction = model.predict(input).argMax(1).dataSync()[0];

        const videoName = `video${prediction + 1}`;
        statusDiv.textContent = `Обнаружено: ${videoName}`;
        playAudio(audioMap[videoName]);
    }, 2000); // Проверка каждые 2 секунды
}

run();
