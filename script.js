const video = document.getElementById('video');
const statusDiv = document.querySelector('.status');
const audioMap = {
    'video1': 'audio/video1.mp3',
    'video2': 'audio/video2.mp3',
    'video3': 'audio/video3.mp3'
};
let currentAudio = null;
let predictionBuffer = [];
const CONFIDENCE_THRESHOLD = 0.99; // Порог уверенности
const BUFFER_SIZE = 5;             // Количество одинаковых предсказаний подряд

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
        const prediction = model.predict(input).dataSync();

        const maxConfidence = Math.max(...prediction);  // Максимальная уверенность
        const predictedClass = prediction.indexOf(maxConfidence);  // Класс с наибольшей уверенностью

        // Проверяем уверенность ≥ 99%
        if (maxConfidence >= CONFIDENCE_THRESHOLD) {
            predictionBuffer.push(predictedClass);

            // Проверяем, есть ли в буфере 5 одинаковых предсказаний подряд
            if (predictionBuffer.length >= BUFFER_SIZE) {
                const consistentPrediction = predictionBuffer.slice(-BUFFER_SIZE);
                if (consistentPrediction.every(p => p === predictedClass)) {
                    const videoName = `video${predictedClass + 1}`;
                    statusDiv.textContent = `Обнаружено: ${videoName} (уверенность: ${Math.round(maxConfidence * 100)}%)`;
                    playAudio(audioMap[videoName]);
                }
            }
        } else {
            predictionBuffer = []; // Сбрасываем буфер, если уверенность ниже порога
        }
    }, 1000); // Проверка каждые 1 секунду
}

run();
