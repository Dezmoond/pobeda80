const video = document.getElementById('video');
const statusDiv = document.getElementById('status');
const cameraSelect = document.getElementById('cameraSelect');

const audioMap = {
    'video1': 'audio/video1.mp3',
    'video2': 'audio/video2.mp3',
    'video3': 'audio/video3.mp3'
};

let currentAudio = null;
let predictionBuffer = [];
const CONFIDENCE_THRESHOLD = 0.99;
const BUFFER_SIZE = 5;

// ✅ Загрузка модели
async function loadModel() {
    return await tf.loadLayersModel('./model/model.json');
}

// ✅ Получение списка камер
async function getCameras() {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.filter(device => device.kind === 'videoinput');
}

// ✅ Запуск камеры
async function setupCamera(deviceId) {
    try {
        const constraints = {
            video: deviceId ? { deviceId: { exact: deviceId } } : true
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        video.srcObject = stream;

        return new Promise(resolve => {
            video.onloadedmetadata = () => {
                video.play();
                resolve(video);
            };
        });
    } catch (error) {
        alert("Ошибка доступа к камере. Разрешите использование камеры.");
        console.error("Ошибка:", error);
        statusDiv.textContent = "❌ Камера не доступна.";
    }
}

// ✅ Инициализация камер
async function initCameraSelection() {
    const cameras = await getCameras();
    if (cameras.length === 0) {
        alert("Камеры не найдены.");
        return;
    }

    cameraSelect.innerHTML = "";
    cameras.forEach(camera => {
        const option = document.createElement('option');
        option.value = camera.deviceId;
        option.textContent = camera.label || `Камера ${cameraSelect.length + 1}`;
        cameraSelect.appendChild(option);
    });

    cameraSelect.addEventListener('change', () => setupCamera(cameraSelect.value));

    await setupCamera(cameras[0].deviceId);
}

// ✅ Воспроизведение звука
function playAudio(audioSrc) {
    if (currentAudio) currentAudio.pause();
    currentAudio = new Audio(audioSrc);
    currentAudio.play();
}

// ✅ Основной процесс классификации
async function run() {
    const model = await loadModel();
    await initCameraSelection();

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    setInterval(() => {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        const input = tf.browser.fromPixels(canvas)
            .resizeNearestNeighbor([224, 224])
            .toFloat()
            .expandDims();
        
        const prediction = model.predict(input).dataSync();

        const maxConfidence = Math.max(...prediction);
        const predictedClass = prediction.indexOf(maxConfidence);

        if (maxConfidence >= CONFIDENCE_THRESHOLD) {
            predictionBuffer.push(predictedClass);

            if (predictionBuffer.length >= BUFFER_SIZE) {
                const consistentPrediction = predictionBuffer.slice(-BUFFER_SIZE);
                if (consistentPrediction.every(p => p === predictedClass)) {
                    const videoName = `video${predictedClass + 1}`;
                    statusDiv.textContent = `✅ Обнаружено: ${videoName} (уверенность: ${Math.round(maxConfidence * 100)}%)`;
                    playAudio(audioMap[videoName]);
                }
            }
        } else {
            predictionBuffer = [];
            statusDiv.textContent = "🔍 Идентификация...";
        }
    }, 1000);
}

run();
