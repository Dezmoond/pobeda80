const video = document.getElementById('video');
const statusDiv = document.querySelector('.status');

const audioMap = {
    'video1': 'audio/video1.mp3',
    'video2': 'audio/video2.mp3',
    'video3': 'audio/video3.mp3'
};

let currentAudio = null;
let predictionBuffer = [];
const CONFIDENCE_THRESHOLD = 0.99;
const BUFFER_SIZE = 5;

// Загрузка модели
async function loadModel() {
    return await tf.loadLayersModel('./model/model.json');
}

// Запрос разрешения и выбор камеры
async function setupCamera() {
    try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(device => device.kind === 'videoinput');

        if (videoDevices.length === 0) {
            alert('Камера не найдена');
            return;
        }

        // Выбор устройства камеры
        const selectedDeviceId = videoDevices.length === 1
            ? videoDevices[0].deviceId // Если одна камера — берём её
            : videoDevices[videoDevices.length - 1].deviceId; // Если несколько, берем последнюю (обычно задняя камера)

        const constraints = {
            video: {
                deviceId: { exact: selectedDeviceId },
                facingMode: { ideal: 'environment' }, // Предпочтение для задней камеры
                width: { ideal: window.innerWidth },
                height: { ideal: window.innerHeight }
            },
            audio: false
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
        alert("Ошибка доступа к камере. Пожалуйста, разрешите доступ.");
        console.error("Ошибка доступа к камере:", error);
        statusDiv.textContent = "❌ Камера не доступна.";
    }
}

// Воспроизведение звука
function playAudio(audioSrc) {
    if (currentAudio) {
        currentAudio.pause();
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
    }, 1000); // Проверка каждые 1 секунду
}

run();
